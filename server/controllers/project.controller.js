// controllers/project.controller.js
const Project = require("../models/Project");
const { nextSequence } = require("../models/Counter");
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
    const { page = 1, limit = 20, status, clientId, search, sort = "-createdAt" } = req.query;
    const filter = { isArchived: false };

    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    // Role scoping
    const role = req.user.role;
    if (role === "client") {
      filter.clientId = req.user.linkedClientId;
    } else if (TEAM_SCOPED_ROLES.includes(role)) {
      filter["teamMembers.userId"] = req.user.id;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { projectId: { $regex: search, $options: "i" } },
      ];
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      Project.find(filter)
        .populate("clientId", "companyName displayName")
        .populate("projectManagerId", "name avatar")
        .populate("teamMembers.userId", "name avatar role")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      Project.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
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

    const allowed = ["name", "description", "type", "priority", "startDate", "endDate", "budget", "currency", "tags", "overallProgress", "projectManagerId"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) project[key] = req.body[key];
    }

    // When PM changes, swap the teamMembers entry
    if (req.body.projectManagerId) {
      const newPmId = String(req.body.projectManagerId);
      const oldPmId = project.projectManagerId ? String(project.projectManagerId) : null;

      // Remove old PM from teamMembers (they were only there because they were PM)
      if (oldPmId && oldPmId !== newPmId) {
        project.teamMembers = project.teamMembers.filter(m => String(m.userId) !== oldPmId);
      }

      // Add new PM to teamMembers if not already present
      const alreadyMember = project.teamMembers.some(m => String(m.userId) === newPmId);
      if (!alreadyMember) {
        project.teamMembers.push({ userId: newPmId, projectRole: "Project Manager", addedBy: req.user.id });
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
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");

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
    project.milestones.push({ title, dueDate: dueDate || null });
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};

exports.toggleMilestone = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) throw new NotFoundError("Milestone");
    milestone.isCompleted = !milestone.isCompleted;
    milestone.completedAt = milestone.isCompleted ? new Date() : null;
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};
