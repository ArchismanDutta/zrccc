// controllers/project.controller.js
const Project = require("../models/Project");
const Client  = require("../models/Client");
const User    = require("../models/User");
const { nextSequence } = require("../models/Counter");
const { escapeRegex, sanitizeSort, parsePagination } = require("../utils/sanitize");

const PROJECT_SORTS = ["-createdAt", "createdAt", "name", "-name", "-updatedAt", "updatedAt"];
const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"];
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

const TEAM_SCOPED_ROLES = [
  "project_manager", "account_manager", "dept_head", "employee",
  "social_media_manager", "graphic_designer", "video_editor",
  "cinematographer", "content_writer", "web_developer",
];

exports.createProject = async (req, res, next) => {
  try {
    const { name, clientId, type, projectManagerId } = req.body;
    if (!name || !clientId || !projectManagerId) {
      throw new ValidationError("name, clientId, and projectManagerId are required");
    }

    const [clientExists, pmExists] = await Promise.all([
      Client.exists({ _id: clientId, isArchived: false }),
      User.exists({ _id: projectManagerId, isActive: true }),
    ]);
    if (!clientExists) throw new ValidationError("Client not found");
    if (!pmExists) throw new ValidationError("Project manager not found");

    const seq = await nextSequence("project");
    const projectId = `ZRC-PRJ-${String(seq).padStart(5, "0")}`;

    const project = await Project.create({
      projectId, name, description: req.body.description || "",
      type: type || [], clientId, projectManagerId,
      priority: req.body.priority || "medium",
      startDate: req.body.startDate, endDate: req.body.endDate,
      budget: req.body.budget || 0, currency: req.body.currency || "INR",
      tags: req.body.tags || [],
      teamMembers: [{ userId: projectManagerId, projectRole: "Project Manager", addedBy: req.user.id }],
      statusHistory: [{ to: "planning", changedBy: req.user.id }],
      createdBy: req.user.id,
    });

    await logAudit({ action: "project.create", entity: "Project", entityId: project._id, userId: req.user.id, details: { projectId, name }, req });
    created(res, project);
  } catch (err) { next(err); }
};

exports.listProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, clientId, search } = req.query;
    const sort = sanitizeSort(req.query.sort, PROJECT_SORTS, "-createdAt");
    const filter = { isArchived: false };

    if (status) {
      if (!PROJECT_STATUSES.includes(status)) throw new ValidationError(`Invalid status. Allowed: ${PROJECT_STATUSES.join(", ")}`);
      filter.status = status;
    }
    if (clientId) filter.clientId = clientId;

    // Role scoping
    const role = req.user.role;
    if (role === "client") {
      filter.clientId = req.user.linkedClientId;
    } else if (TEAM_SCOPED_ROLES.includes(role)) {
      filter["teamMembers.userId"] = req.user.id;
    }

    if (search) {
      const s = escapeRegex(search);
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { projectId: { $regex: s, $options: "i" } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 20);
    const [docs, total] = await Promise.all([
      Project.find(filter)
        .populate("clientId", "companyName displayName")
        .populate("projectManagerId", "name avatar")
        .populate("teamMembers.userId", "name avatar role")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      Project.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("clientId", "companyName displayName contactName services contract")
      .populate("projectManagerId", "name email avatar")
      .populate("teamMembers.userId", "name email avatar role")
      .lean();
    if (!project || project.isArchived) throw new NotFoundError("Project");

    const role = req.user.role;
    if (role === "client" && String(project.clientId?._id || project.clientId) !== String(req.user.linkedClientId)) {
      throw new NotFoundError("Project");
    }
    if (TEAM_SCOPED_ROLES.includes(role)) {
      const isMember = project.teamMembers.some(m => String(m.userId?._id || m.userId) === String(req.user.id));
      if (!isMember) throw new NotFoundError("Project");
    }

    success(res, project);
  } catch (err) { next(err); }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.isArchived) throw new NotFoundError("Project");

    const role = req.user.role;
    if (TEAM_SCOPED_ROLES.includes(role)) {
      const isMember = project.teamMembers.some(m => String(m.userId) === String(req.user.id));
      if (!isMember) throw new NotFoundError("Project");
    }

    // Capture old PM before any field updates
    const oldPmId = project.projectManagerId ? String(project.projectManagerId) : null;

    // All team members may update descriptive fields; financial/management fields are admin/PM-only
    const isManager = ["super_admin", "admin", "project_manager"].includes(role);
    const allowed = ["name", "description", "type", "priority", "startDate", "endDate", "tags", "overallProgress"];
    if (isManager) allowed.push("budget", "currency", "projectManagerId");
    for (const key of allowed) {
      if (req.body[key] !== undefined) project[key] = req.body[key];
    }

    // When PM changes, swap the teamMembers entry (only reachable for managers)
    if (isManager && req.body.projectManagerId) {
      const newPmId = String(req.body.projectManagerId);

      // Remove old PM from teamMembers
      if (oldPmId && oldPmId !== newPmId) {
        project.teamMembers = project.teamMembers.filter(m => String(m.userId) !== oldPmId);
      }

      // Add new PM to teamMembers if not already present
      const alreadyMember = project.teamMembers.some(m => String(m.userId) === newPmId);
      if (!alreadyMember) {
        project.teamMembers.push({ userId: req.body.projectManagerId, projectRole: "Project Manager", addedBy: req.user.id });
      }
    }

    await project.save();
    await logAudit({ action: "project.update", entity: "Project", entityId: project._id, userId: req.user.id, details: { fields: Object.keys(req.body) }, req });
    success(res, project);
  } catch (err) { next(err); }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!status) throw new ValidationError("status is required");
    if (!PROJECT_STATUSES.includes(status)) throw new ValidationError(`Invalid status. Allowed: ${PROJECT_STATUSES.join(", ")}`);
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

    if (TEAM_SCOPED_ROLES.includes(req.user.role)) {
      const isMember = project.teamMembers.some(m => String(m.userId) === String(req.user.id));
      if (!isMember) throw new NotFoundError("Project");
    }

    if (status === "cancelled" && !reason) throw new ValidationError("Cancel reason required");

    project.statusHistory.push({ from: project.status, to: status, changedBy: req.user.id, reason: reason || "" });
    project.status = status;
    if (status === "cancelled") project.cancelReason = reason;
    await project.save();

    await logAudit({ action: "project.status_change", entity: "Project", entityId: project._id, userId: req.user.id, details: { to: status }, req });
    success(res, project);
  } catch (err) { next(err); }
};

exports.addTeamMember = async (req, res, next) => {
  try {
    const { userId, projectRole } = req.body;
    if (!userId) throw new ValidationError("userId is required");
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

    // Project managers may only manage their own projects
    if (req.user.role === "project_manager" &&
        String(project.projectManagerId) !== String(req.user.id)) {
      throw new NotFoundError("Project");
    }

    const userExists = await User.exists({ _id: userId, isActive: true });
    if (!userExists) throw new ValidationError("User not found");

    const alreadyMember = project.teamMembers.some(m => m.userId.toString() === userId);
    if (alreadyMember) throw new ValidationError("User is already a team member");

    project.teamMembers.push({ userId, projectRole: projectRole || "", addedBy: req.user.id });
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};

exports.removeTeamMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

    // Project managers may only manage their own projects
    if (req.user.role === "project_manager" &&
        String(project.projectManagerId) !== String(req.user.id)) {
      throw new NotFoundError("Project");
    }

    if (String(project.projectManagerId) === req.params.userId) {
      throw new ValidationError("Cannot remove the project manager from the team");
    }

    project.teamMembers = project.teamMembers.filter(m => m.userId.toString() !== req.params.userId);
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};

exports.archiveProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");
    project.isArchived = true;
    await project.save();
    await logAudit({ action: "project.archive", entity: "Project", entityId: project._id, userId: req.user.id, req });
    success(res, { message: "Project archived" });
  } catch (err) { next(err); }
};

exports.addMilestone = async (req, res, next) => {
  try {
    const { title, dueDate } = req.body;
    if (!title) throw new ValidationError("title is required");
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

    if (TEAM_SCOPED_ROLES.includes(req.user.role)) {
      const isMember = project.teamMembers.some(m => String(m.userId) === String(req.user.id));
      if (!isMember) throw new NotFoundError("Project");
    }
    project.milestones.push({ title, dueDate: dueDate || null });
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};

exports.toggleMilestone = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

    if (TEAM_SCOPED_ROLES.includes(req.user.role)) {
      const isMember = project.teamMembers.some(m => String(m.userId) === String(req.user.id));
      if (!isMember) throw new NotFoundError("Project");
    }
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) throw new NotFoundError("Milestone");
    milestone.isCompleted = !milestone.isCompleted;
    milestone.completedAt = milestone.isCompleted ? new Date() : null;
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};
