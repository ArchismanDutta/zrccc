// controllers/audit.controller.js
const AuditLog = require("../models/AuditLog");
const { paginated } = require("../utils/response");
const { escapeRegex, sanitizeSort, parsePagination } = require("../utils/sanitize");

const AUDIT_SORTS = ["-createdAt", "createdAt", "-action", "action", "-entity", "entity"];

// GET /api/audit
exports.listAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entity, userId, action, search, sort = "-createdAt" } = req.query;
    const filter = {};

    if (entity) filter.entity = entity;
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: escapeRegex(action), $options: "i" };
    if (search) {
      const s = escapeRegex(search);
      filter.$or = [
        { action:   { $regex: s, $options: "i" } },
        { entity:   { $regex: s, $options: "i" } },
        { userName: { $regex: s, $options: "i" } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 50);
    const safeSort  = sanitizeSort(sort, AUDIT_SORTS, "-createdAt");

    const [docs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email avatar")
        .sort(safeSort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};
