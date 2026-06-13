// controllers/task.controller.js
const Task = require("../models/Task");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

exports.createTask = async (req, res, next) => {
  try {
    const { title, category, assignedTo } = req.body;
    if (!title || !category) throw new ValidationError("title and category are required");

    const seq = await nextSequence("task");
    const taskId = `ZRC-TSK-${String(seq).padStart(5, "0")}`;

    const task = await Task.create({
      taskId, title, description: req.body.description || "", category,
      projectId: req.body.projectId || null,
      contentItemId: req.body.contentItemId || null,
      assignedTo: assignedTo || [], assignedBy: req.user.id,
      priority: req.body.priority || "medium", dueDate: req.body.dueDate || null,
      estimatedHours: req.body.estimatedHours || 0,
      tags: req.body.tags || [],
      isRecurring: req.body.isRecurring || false,
      recurringConfig: req.body.recurringConfig || {},
      createdBy: req.user.id,
    });

    await logAudit({ action: "task.create", entity: "Task", entityId: task._id, userId: req.user.id, details: { taskId, title, category }, req });
    created(res, task);
  } catch (err) { next(err); }
};

exports.listTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, category, projectId, assignee, search, sort = "-createdAt" } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (projectId) filter.projectId = projectId;
    if (assignee) filter.assignedTo = assignee;

    // Employee-level roles see only their own tasks
    const empRoles = ["employee", "social_media_manager", "graphic_designer", "video_editor", "cinematographer", "content_writer", "web_developer"];
    if (empRoles.includes(req.user.role)) {
      filter.assignedTo = req.user.id;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { taskId: { $regex: search, $options: "i" } },
      ];
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "name avatar role")
        .populate("assignedBy", "name")
        .populate("projectId", "name projectId")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      Task.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
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
    success(res, task);
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");

    const allowed = ["title", "description", "category", "priority", "dueDate", "estimatedHours", "actualHours", "tags", "assignedTo"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    }
    await task.save();
    success(res, task);
  } catch (err) { next(err); }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ValidationError("status is required");
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");

    // Auto-set timestamps
    if (status === "in_progress" && !task.startedAt) task.startedAt = new Date();
    if (status === "done") task.completedAt = new Date();

    task.status = status;
    await task.save();

    await logAudit({ action: "task.status_change", entity: "Task", entityId: task._id, userId: req.user.id, details: { to: status }, req });
    success(res, task);
  } catch (err) { next(err); }
};

exports.addProgressUpdate = async (req, res, next) => {
  try {
    const { content, percentage } = req.body;
    if (!content) throw new ValidationError("content is required");
    const task = await Task.findById(req.params.id);
    if (!task) throw new NotFoundError("Task");

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

    task.reviewedBy = req.user.id;
    task.reviewNote = note || "";
    task.status = decision === "approve" ? "done" : "revision_needed";
    if (decision === "approve") task.completedAt = new Date();
    await task.save();

    await logAudit({ action: `task.review_${decision}`, entity: "Task", entityId: task._id, userId: req.user.id, details: { note }, req });
    success(res, task);
  } catch (err) { next(err); }
};
