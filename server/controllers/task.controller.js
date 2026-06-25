// controllers/task.controller.js
const Task = require("../models/Task");
const { nextSequence } = require("../models/Counter");
const { escapeRegex, sanitizeSort, parsePagination } = require("../utils/sanitize");

const TASK_SORTS      = ["-createdAt", "createdAt", "dueDate", "-dueDate", "priority", "-priority", "-updatedAt", "updatedAt"];
const TASK_STATUSES   = ["todo", "in_progress", "review", "revision_needed", "done", "cancelled"];
const TASK_CATEGORIES = ["shooting", "reel_editing", "video_editing", "graphic_design", "carousel_design", "meta_ad_creative", "meta_ads_management", "caption_writing", "ad_copy", "content_planning", "scheduling", "web_development", "web_maintenance", "client_report", "internal", "review"];
const RECURRING_FREQS = ["daily", "weekly", "biweekly", "monthly"];

function computeNextRunAt(base, frequency) {
  const d = new Date(base);
  switch (frequency) {
    case "daily":    d.setDate(d.getDate() + 1);   break;
    case "weekly":   d.setDate(d.getDate() + 7);   break;
    case "biweekly": d.setDate(d.getDate() + 14);  break;
    case "monthly":  d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { sendNotification, sendNotificationToMany } = require("../services/notification.service");

const _checkTaskAccess = async (task, user) => {
  const role = user.role;
  if (["super_admin", "admin"].includes(role)) return;
  if (role === "project_manager") {
    const Project = require("../models/Project");
    const onProject = await Project.exists({ _id: task.projectId, "teamMembers.userId": user.id });
    if (!onProject) throw new NotFoundError("Task");
    return;
  }
  const isAssigned = (task.assignedTo || []).some(u => String(u._id || u) === String(user.id));
  if (!isAssigned) throw new NotFoundError("Task");
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, category, assignedTo } = req.body;
    if (!title || !category) throw new ValidationError("title and category are required");

    // When a projectId is supplied, non-admin roles must be a member of that project
    const projectId = req.body.projectId || null;
    if (projectId && !["super_admin", "admin", "account_manager"].includes(req.user.role)) {
      const Project = require("../models/Project");
      const accessible = await Project.exists({ _id: projectId, "teamMembers.userId": req.user.id });
      if (!accessible) throw new NotFoundError("Project");
    }

    const seq = await nextSequence("task");
    const taskId = `ZRC-TSK-${String(seq).padStart(5, "0")}`;

    // Build recurring config with computed nextRunAt
    const isRecurring = !!req.body.isRecurring;
    const recurringConfig = {};
    if (isRecurring) {
      const freq = req.body.recurringConfig?.frequency;
      if (freq && RECURRING_FREQS.includes(freq)) {
        recurringConfig.frequency = freq;
        const base = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
        recurringConfig.nextRunAt = computeNextRunAt(base, freq);
      } else {
        recurringConfig.frequency = "weekly";
        recurringConfig.nextRunAt = computeNextRunAt(new Date(), "weekly");
      }
    }

    const task = await Task.create({
      taskId, title, description: req.body.description || "", category,
      projectId: req.body.projectId || null,
      contentItemId: req.body.contentItemId || null,
      assignedTo: assignedTo || [], assignedBy: req.user.id,
      priority: req.body.priority || "medium", dueDate: req.body.dueDate || null,
      estimatedHours: req.body.estimatedHours || 0,
      tags: req.body.tags || [],
      isRecurring,
      recurringConfig,
      createdBy: req.user.id,
    });

    await logAudit({ action: "task.create", entity: "Task", entityId: task._id, userId: req.user.id, details: { taskId, title, category }, req });

    // Notify assignees (skip the person who created the task)
    const io = req.app.get("io");
    const recipients = (assignedTo || []).map(String).filter(id => id !== String(req.user.id));
    await sendNotificationToMany(io, recipients, {
      type: "task_assigned",
      title: "New task assigned to you",
      body: title,
      link: `/tasks/${task._id}`,
      data: { taskId: task._id },
    });

    created(res, task);
  } catch (err) { next(err); }
};

exports.listTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, category, projectId, assignee, search } = req.query;
    const sort = sanitizeSort(req.query.sort, TASK_SORTS, "-createdAt");
    const filter = {};

    if (status) {
      const statuses = String(status).split(",").map(s => s.trim()).filter(Boolean);
      const invalid = statuses.filter(s => !TASK_STATUSES.includes(s));
      if (invalid.length) throw new ValidationError(`Invalid status: ${invalid.join(", ")}. Allowed: ${TASK_STATUSES.join(", ")}`);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (category) {
      if (!TASK_CATEGORIES.includes(category)) throw new ValidationError(`Invalid category. Allowed: ${TASK_CATEGORIES.join(", ")}`);
      filter.category = category;
    }
    if (projectId) filter.projectId = projectId;
    if (assignee) filter.assignedTo = assignee;

    // Role-based task scoping
    const role = req.user.role;
    if (role === "project_manager") {
      // PMs see tasks on projects they're assigned to
      const Project = require("../models/Project");
      const myProjects = await Project.find({ "teamMembers.userId": req.user.id }, "_id").lean();
      const myProjectIds = myProjects.map(p => p._id);
      // If caller also supplied ?projectId, intersect rather than overwrite
      if (filter.projectId) {
        const requested = String(filter.projectId);
        const allowed = myProjectIds.map(p => String(p));
        if (!allowed.includes(requested)) throw new NotFoundError("Project");
        // filter.projectId already set to the requested value — leave it
      } else {
        filter.projectId = { $in: myProjectIds };
      }
    } else if (!["super_admin", "admin", "dept_head"].includes(role)) {
      // Everyone else sees only tasks assigned to them
      filter.assignedTo = req.user.id;
    }

    if (search) {
      const s = escapeRegex(search);
      filter.$or = [
        { title: { $regex: s, $options: "i" } },
        { taskId: { $regex: s, $options: "i" } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 20);
    const [docs, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "name avatar role")
        .populate("assignedBy", "name")
        .populate("projectId", "name projectId")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      Task.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email avatar role")
      .populate("assignedBy", "name email")
      .populate("projectId", "name projectId clientId")
      .populate("reviewedBy", "name")
      .lean();
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);
    success(res, task);
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);

    const allowed = ["title", "description", "category", "priority", "dueDate", "estimatedHours", "actualHours", "tags", "assignedTo", "isRecurring"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    }
    // Update recurringConfig when toggling or changing frequency
    if (req.body.recurringConfig !== undefined) {
      const freq = req.body.recurringConfig?.frequency;
      if (freq && RECURRING_FREQS.includes(freq)) {
        task.recurringConfig.frequency = freq;
        // Recompute nextRunAt only if not already set or frequency changed
        if (!task.recurringConfig.nextRunAt || req.body.recurringConfig.frequency) {
          const base = task.dueDate || new Date();
          task.recurringConfig.nextRunAt = computeNextRunAt(base, freq);
        }
      }
    }
    await task.save();
    await logAudit({ action: "task.update", entity: "Task", entityId: task._id, userId: req.user.id, details: { fields: Object.keys(req.body).filter(k => allowed.includes(k)) }, req });
    success(res, task);
  } catch (err) { next(err); }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ValidationError("status is required");
    if (!TASK_STATUSES.includes(status)) throw new ValidationError(`Invalid status. Allowed: ${TASK_STATUSES.join(", ")}`);
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);

    // Auto-set timestamps
    if (status === "in_progress" && !task.startedAt) task.startedAt = new Date();
    if (status === "done") task.completedAt = new Date();

    task.status = status;
    await task.save();

    await logAudit({ action: "task.status_change", entity: "Task", entityId: task._id, userId: req.user.id, details: { to: status }, req });

    // When submitted for review, notify whoever assigned the task
    if (status === "review" && task.assignedBy) {
      const io = req.app.get("io");
      await sendNotification(io, task.assignedBy, {
        type: "task_review_requested",
        title: "Task ready for review",
        body: task.title,
        link: `/tasks/${task._id}`,
        data: { taskId: task._id },
      });
    }

    success(res, task);
  } catch (err) { next(err); }
};

exports.addProgressUpdate = async (req, res, next) => {
  try {
    const { content, percentage } = req.body;
    if (!content) throw new ValidationError("content is required");
    if (percentage !== undefined) {
      const pct = Number(percentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new ValidationError("percentage must be a number between 0 and 100");
    }
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);

    task.progressUpdates.push({ content, percentage, createdBy: req.user.id });
    await task.save();
    success(res, task);
  } catch (err) { next(err); }
};

exports.addIssueReport = async (req, res, next) => {
  try {
    const { title, description, severity } = req.body;
    if (!title) throw new ValidationError("title is required");
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);

    task.issueReports.push({ title, description: description || "", severity: severity || "medium", createdBy: req.user.id });
    await task.save();
    success(res, task);
  } catch (err) { next(err); }
};

exports.submitReview = async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    if (!decision || !["approve", "reject"].includes(decision)) throw new ValidationError("decision must be 'approve' or 'reject'");

    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");
    await _checkTaskAccess(task, req.user);

    task.reviewedBy = req.user.id;
    task.reviewNote = note || "";
    task.status = decision === "approve" ? "done" : "revision_needed";
    if (decision === "approve") task.completedAt = new Date();
    await task.save();

    await logAudit({ action: `task.review_${decision}`, entity: "Task", entityId: task._id, userId: req.user.id, details: { note }, req });

    // Notify all assignees of the review outcome
    const io = req.app.get("io");
    const recipients = (task.assignedTo || []).map(String).filter(id => id !== String(req.user.id));
    await sendNotificationToMany(io, recipients, {
      type: decision === "approve" ? "task_approved" : "task_revision_needed",
      title: decision === "approve" ? "Task approved ✓" : "Task needs revision",
      body: task.title,
      link: `/tasks/${task._id}`,
      data: { taskId: task._id },
    });

    success(res, task);
  } catch (err) { next(err); }
};
