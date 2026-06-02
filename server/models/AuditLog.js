// models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action:     { type: String, required: true },    // e.g. "client.create", "task.status_change"
  entity:     { type: String, required: true },    // e.g. "Client", "Task", "Invoice"
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName:   { type: String, default: "" },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress:  { type: String, default: "" },
  userAgent:  { type: String, default: "" },
}, { timestamps: true });

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
