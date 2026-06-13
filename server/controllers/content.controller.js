// controllers/content.controller.js
const ContentItem = require("../models/ContentItem");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

exports.createContent = async (req, res, next) => {
  try {
    const { title, contentType, projectId, clientId } = req.body;
    if (!title || !contentType || !projectId || !clientId) {
      throw new ValidationError("title, contentType, projectId, and clientId are required");
    }

    const seq = await nextSequence("content");
    const contentId = `ZRC-CON-${String(seq).padStart(5, "0")}`;

    const item = await ContentItem.create({
      contentId, projectId, clientId, title, contentType,
      platform: req.body.platform || [],
      caption: req.body.caption || "", hashtags: req.body.hashtags || [],
      adDetails: req.body.adDetails || {},
      status: "idea",
      statusHistory: [{ to: "idea", changedBy: req.user.id }],
      assignedTo: req.body.assignedTo || [],
      plannedMonth: req.body.plannedMonth || "",
      weekNumber: req.body.weekNumber || null,
      dayOfWeek: req.body.dayOfWeek || "",
      postingTime: req.body.postingTime || "",
      priority: req.body.priority || "medium",
      clientFacing: req.body.clientFacing ?? false,
      requiresClientApproval: req.body.requiresClientApproval ?? false,
      isAdCreative: req.body.isAdCreative ?? false,
      createdBy: req.user.id,
    });

    await logAudit({ action: "content.create", entity: "ContentItem", entityId: item._id, userId: req.user.id, details: { contentId, title, contentType }, req });
    created(res, item);
  } catch (err) { next(err); }
};

exports.listContent = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, projectId, clientId, status, contentType, plannedMonth, assignee, sort = "-createdAt" } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;
    if (contentType) filter.contentType = contentType;
    if (plannedMonth) filter.plannedMonth = plannedMonth;
    if (assignee) filter.assignedTo = assignee;

    // Client role scoping
    if (req.user.role === "client") {
      filter.clientId = req.user.linkedClientId;
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      ContentItem.find(filter)
        .populate("assignedTo", "name avatar role")
        .populate("clientId", "companyName displayName")
        .populate("projectId", "name")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      ContentItem.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
  } catch (err) { next(err); }
};

exports.getContent = async (req, res, next) => {
  try {
    const item = await ContentItem.findById(req.params.id)
      .populate("assignedTo", "name email avatar role")
      .populate("reviewedBy", "name")
      .populate("clientId", "companyName displayName")
      .populate("projectId", "name projectId")
      .lean();
    if (!item) throw new NotFoundError("Content Item");
    success(res, item);
  } catch (err) { next(err); }
};

exports.updateContent = async (req, res, next) => {
  try {
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");

    const allowed = ["title", "contentType", "platform", "caption", "hashtags", "adDetails", "assignedTo", "plannedMonth", "weekNumber", "dayOfWeek", "postingTime", "priority", "clientFacing", "requiresClientApproval", "isAdCreative", "scheduledAt"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    }
    await item.save();
    success(res, item);
  } catch (err) { next(err); }
};

exports.changeStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) throw new ValidationError("status is required");
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");

    item.statusHistory.push({ from: item.status, to: status, changedBy: req.user.id, note: note || "" });
    item.status = status;

    if (status === "published") item.publishedAt = new Date();
    await item.save();

    await logAudit({ action: "content.status_change", entity: "ContentItem", entityId: item._id, userId: req.user.id, details: { to: status }, req });
    success(res, item);
  } catch (err) { next(err); }
};

exports.approveContent = async (req, res, next) => {
  try {
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");

    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.reviewNotes = req.body.notes || "";

    const newStatus = item.requiresClientApproval ? "awaiting_client" : "approved";
    item.statusHistory.push({ from: item.status, to: newStatus, changedBy: req.user.id, note: req.body.notes || "" });
    item.status = newStatus;
    await item.save();

    await logAudit({ action: "content.approve", entity: "ContentItem", entityId: item._id, userId: req.user.id, req });
    success(res, item);
  } catch (err) { next(err); }
};

exports.rejectContent = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (!feedback) throw new ValidationError("feedback is required when rejecting");
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");

    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.reviewNotes = feedback;
    item.revisionHistory.push({ feedback, reviewedBy: req.user.id });
    item.statusHistory.push({ from: item.status, to: "revision_needed", changedBy: req.user.id, note: feedback });
    item.status = "revision_needed";
    await item.save();

    await logAudit({ action: "content.reject", entity: "ContentItem", entityId: item._id, userId: req.user.id, details: { feedback }, req });
    success(res, item);
  } catch (err) { next(err); }
};

exports.pendingApproval = async (req, res, next) => {
  try {
    const docs = await ContentItem.find({ status: "in_review" })
      .populate("assignedTo", "name avatar")
      .populate("clientId", "companyName")
      .populate("projectId", "name")
      .sort("-updatedAt").lean();
    success(res, docs);
  } catch (err) { next(err); }
};
