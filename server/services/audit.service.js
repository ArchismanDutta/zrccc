// services/audit.service.js
// Centralized audit logging. Every destructive action calls this.
const AuditLog = require("../models/AuditLog");

async function logAudit({ action, entity, entityId, userId, userName, details = {}, req }) {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      userId,
      userName: userName || "",
      details,
      ipAddress: req?.ip || "",
      userAgent: req?.get("user-agent") || "",
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { logAudit };
