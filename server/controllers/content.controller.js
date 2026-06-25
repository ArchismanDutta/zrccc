// controllers/content.controller.js
const ContentItem = require("../models/ContentItem");
const Client = require("../models/Client");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { sendContentApprovalEmail } = require("../utils/mailer");
const { FRONTEND_ORIGINS } = require("../config/env");
const { sanitizeSort, parsePagination } = require("../utils/sanitize");
const { sendNotificationToMany } = require("../services/notification.service");

const CONTENT_SORTS    = ["-createdAt", "createdAt", "-updatedAt", "updatedAt", "priority", "-priority"];
const CONTENT_STATUSES = ["idea", "draft", "in_review", "revision_needed", "approved", "awaiting_client", "scheduled", "published", "cancelled"];
const CONTENT_TYPES    = ["reel", "static_post", "carousel", "story", "video", "meta_ad_creative", "banner", "thumbnail", "website_content", "ad_copy"];
const APPROVAL_TIER_STATUSES = new Set(["approved", "awaiting_client", "published"]);

exports.createContent = async (req, res, next) => {
  try {
    const { title, contentType, projectId, clientId } = req.body;
    if (!title || !contentType || !projectId || !clientId) {
      throw new ValidationError("title, contentType, projectId, and clientId are required");
    }

    // Non-admin roles may only create content on projects they belong to
    const role = req.user.role;
    if (!["super_admin", "admin", "account_manager"].includes(role)) {
      const Project = require("../models/Project");
      const accessible = await Project.exists({ _id: projectId, "teamMembers.userId": req.user.id });
      if (!accessible) throw new NotFoundError("Project");
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
    const { page = 1, limit = 50, projectId, clientId, status, contentType, plannedMonth, assignee } = req.query;
    const sort = sanitizeSort(req.query.sort, CONTENT_SORTS, "-createdAt");
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (clientId) filter.clientId = clientId;
    if (status) {
      const statuses = String(status).split(",").map(s => s.trim()).filter(Boolean);
      const invalid = statuses.filter(s => !CONTENT_STATUSES.includes(s));
      if (invalid.length) throw new ValidationError(`Invalid status: ${invalid.join(", ")}. Allowed: ${CONTENT_STATUSES.join(", ")}`);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (contentType) {
      if (!CONTENT_TYPES.includes(contentType)) throw new ValidationError(`Invalid contentType. Allowed: ${CONTENT_TYPES.join(", ")}`);
      filter.contentType = contentType;
    }
    if (plannedMonth) filter.plannedMonth = plannedMonth;
    if (assignee) filter.assignedTo = assignee;

    // Role-based scoping
    const role = req.user.role;
    if (role === "client") {
      filter.clientId = req.user.linkedClientId;
    } else if (role === "project_manager") {
      const Project = require("../models/Project");
      const myProjects = await Project.find({ "teamMembers.userId": req.user.id }, "_id").lean();
      const myProjectIds = myProjects.map(p => p._id);
      // If caller also supplied ?projectId, intersect rather than overwrite
      if (filter.projectId) {
        const requested = String(filter.projectId);
        const allowed = myProjectIds.map(p => String(p));
        if (!allowed.includes(requested)) throw new NotFoundError("Content Item");
        // filter.projectId already set to the requested value — leave it
      } else {
        filter.projectId = { $in: myProjectIds };
      }
    } else if (!["super_admin", "admin", "account_manager", "dept_head"].includes(role)) {
      filter.assignedTo = req.user.id;
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 20);
    const [docs, total] = await Promise.all([
      ContentItem.find(filter)
        .populate("assignedTo", "name avatar role")
        .populate("clientId", "companyName displayName")
        .populate("projectId", "name")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      ContentItem.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

const _checkContentAccess = async (item, user) => {
  const role = user.role;
  if (["super_admin", "admin", "account_manager"].includes(role)) return;
  if (role === "client") {
    if (String(item.clientId?._id || item.clientId) !== String(user.linkedClientId)) throw new NotFoundError("Content Item");
    return;
  }
  if (role === "project_manager") {
    const Project = require("../models/Project");
    const onProject = await Project.exists({ _id: item.projectId?._id || item.projectId, "teamMembers.userId": user.id });
    if (!onProject) throw new NotFoundError("Content Item");
    return;
  }
  const isAssigned = (item.assignedTo || []).some(u => String(u._id || u) === String(user.id));
  if (!isAssigned) throw new NotFoundError("Content Item");
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
    await _checkContentAccess(item, req.user);
    success(res, item);
  } catch (err) { next(err); }
};

exports.updateContent = async (req, res, next) => {
  try {
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");
    await _checkContentAccess(item, req.user);

    const allowed = ["title", "contentType", "platform", "caption", "hashtags", "adDetails", "assignedTo", "plannedMonth", "weekNumber", "dayOfWeek", "postingTime", "priority", "clientFacing", "requiresClientApproval", "isAdCreative", "scheduledAt"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    }
    await item.save();
    await logAudit({ action: "content.update", entity: "ContentItem", entityId: item._id, userId: req.user.id, details: { fields: Object.keys(req.body).filter(k => allowed.includes(k)) }, req });
    success(res, item);
  } catch (err) { next(err); }
};


exports.changeStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) throw new ValidationError("status is required");
    if (!CONTENT_STATUSES.includes(status)) throw new ValidationError(`Invalid status. Allowed: ${CONTENT_STATUSES.join(", ")}`);

    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");
    await _checkContentAccess(item, req.user);

    if (APPROVAL_TIER_STATUSES.has(status) && !req.user.permissions.includes("content:approve")) {
      throw new ForbiddenError(`Setting status to "${status}" requires content:approve permission`);
    }

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
    await _checkContentAccess(item, req.user);

    const isClientApproval = req.user.role === "client";
    const allowedStatuses = isClientApproval ? ["awaiting_client"] : ["in_review"];
    if (!allowedStatuses.includes(item.status)) {
      throw new ValidationError(
        isClientApproval
          ? "Only content awaiting client approval can be approved here"
          : "Only content in 'in_review' status can be approved"
      );
    }

    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.reviewNotes = req.body.notes || "";

    // Client approval always moves to approved; internal approval may gate on client sign-off
    const newStatus = isClientApproval ? "approved" : (item.requiresClientApproval ? "awaiting_client" : "approved");
    item.statusHistory.push({ from: item.status, to: newStatus, changedBy: req.user.id, note: req.body.notes || "" });
    item.status = newStatus;
    await item.save();

    await logAudit({ action: "content.approve", entity: "ContentItem", entityId: item._id, userId: req.user.id, req });

    const io = req.app.get("io");

    if (newStatus === "awaiting_client" && item.clientId) {
      try {
        const client = await Client.findById(item.clientId).lean();
        if (client?.contactEmail) {
          const portalBase = (FRONTEND_ORIGINS[0] || "http://localhost:5173") + "/portal";
          await sendContentApprovalEmail(client, item, portalBase + "/content");
        }
      } catch (_) { /* email failure must never break the response */ }

      // Notify all client-portal users linked to this client
      const User = require("../models/User");
      const clientUsers = await User.find({ linkedClientId: item.clientId, role: "client", isActive: true }, "_id").lean();
      await sendNotificationToMany(io, clientUsers.map(u => u._id), {
        type: "content_awaiting_approval",
        title: "Content ready for your approval",
        body: item.title,
        link: "/portal/content",
        data: { contentItemId: item._id },
      });
    }

    if (newStatus === "approved") {
      // Notify assignees that their content was approved
      const recipients = (item.assignedTo || []).map(String).filter(id => id !== String(req.user.id));
      await sendNotificationToMany(io, recipients, {
        type: "content_approved",
        title: "Content approved ✓",
        body: item.title,
        link: `/tasks`,
        data: { contentItemId: item._id },
      });
    }

    success(res, item);
  } catch (err) { next(err); }
};

exports.rejectContent = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    if (!feedback) throw new ValidationError("feedback is required when rejecting");
    const item = await ContentItem.findById(req.params.id);
    if (!item) throw new NotFoundError("Content Item");
    await _checkContentAccess(item, req.user);

    const isClientRejection = req.user.role === "client";
    const allowedForReject = isClientRejection ? ["awaiting_client"] : ["in_review"];
    if (!allowedForReject.includes(item.status)) {
      throw new ValidationError(
        isClientRejection
          ? "Only content awaiting client approval can be rejected here"
          : "Only content in 'in_review' status can be rejected"
      );
    }

    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.reviewNotes = feedback;
    item.revisionHistory.push({ feedback, reviewedBy: req.user.id });
    item.statusHistory.push({ from: item.status, to: "revision_needed", changedBy: req.user.id, note: feedback });
    item.status = "revision_needed";
    await item.save();

    await logAudit({ action: "content.reject", entity: "ContentItem", entityId: item._id, userId: req.user.id, details: { feedback }, req });

    // Notify assignees that revision is needed
    const io = req.app.get("io");
    const recipients = (item.assignedTo || []).map(String).filter(id => id !== String(req.user.id));
    await sendNotificationToMany(io, recipients, {
      type: "content_revision_needed",
      title: "Content sent back for revision",
      body: item.title,
      link: `/tasks`,
      data: { contentItemId: item._id },
    });

    success(res, item);
  } catch (err) { next(err); }
};

exports.pendingApproval = async (req, res, next) => {
  try {
    const role = req.user.role;
    // Clients see content awaiting their sign-off; internal roles see content in internal review
    const filter = { status: role === "client" ? "awaiting_client" : "in_review" };
    if (role === "client") {
      filter.clientId = req.user.linkedClientId;
    } else if (role === "project_manager") {
      const Project = require("../models/Project");
      const myProjects = await Project.find({ "teamMembers.userId": req.user.id }, "_id").lean();
      filter.projectId = { $in: myProjects.map(p => p._id) };
    } else if (!["super_admin", "admin", "account_manager", "dept_head"].includes(role)) {
      filter.assignedTo = req.user.id;
    }

    const docs = await ContentItem.find(filter)
      .populate("assignedTo", "name avatar")
      .populate("clientId", "companyName")
      .populate("projectId", "name")
      .sort("-updatedAt").lean();
    success(res, docs);
  } catch (err) { next(err); }
};
