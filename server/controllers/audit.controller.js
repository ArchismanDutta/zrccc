// controllers/audit.controller.js
const AuditLog = require("../models/AuditLog");
const { paginated } = require("../utils/response");

// GET /api/audit
exports.listAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entity, userId, action, search, sort = "-createdAt" } = req.query;
    const filter = {};

    if (entity) filter.entity = entity;
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action, $options: "i" };
    if (search) {
      filter.$or = [
        { action:   { $regex: search, $options: "i" } },
        { entity:   { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * safeLimit;

    const [docs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email avatar")
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
  } catch (err) { next(err); }
};
