// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:    { type: String, required: true },     // e.g. "task_assigned", "content_approved", "invoice_overdue"
  title:   { type: String, required: true },
  body:    { type: String, default: "" },
  link:    { type: String, default: "" },        // frontend route to navigate to
  isRead:  { type: Boolean, default: false },
  readAt:  { type: Date },
  data:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
