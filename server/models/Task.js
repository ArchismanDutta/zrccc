// models/Task.js
const mongoose = require("mongoose");

const ATTACHMENT_URL = { type: String, match: [/^https?:\/\//, "Attachment URL must start with http:// or https://"] };

const progressUpdateSchema = new mongoose.Schema({
  content:     { type: String, required: true },
  percentage:  { type: Number, min: 0, max: 100 },
  attachments: [{ url: ATTACHMENT_URL, name: String, type: String }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const issueReportSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  severity:    { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  attachments: [{ url: ATTACHMENT_URL, name: String, type: String }],
  status:      { type: String, enum: ["open", "resolved"], default: "open" },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt:  { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  taskId:      { type: String, unique: true },                              // ZRC-TSK-00001
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: "" },

  category: {
    type: String,
    enum: [
      "shooting", "reel_editing", "video_editing", "graphic_design", "carousel_design",
      "meta_ad_creative", "meta_ads_management", "caption_writing", "ad_copy",
      "content_planning", "scheduling", "web_development", "web_maintenance",
      "client_report", "internal", "review",
    ],
    required: true,
  },

  projectId:      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  contentItemId:  { type: mongoose.Schema.Types.ObjectId, ref: "ContentItem" },

  assignedTo:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  assignedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  status: {
    type: String,
    enum: ["todo", "in_progress", "review", "revision_needed", "done", "cancelled"],
    default: "todo",
  },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },

  dueDate:        { type: Date },
  estimatedHours: { type: Number, default: 0, min: [0, "Estimated hours cannot be negative"] },
  actualHours:    { type: Number, default: 0, min: [0, "Actual hours cannot be negative"] },
  startedAt:      { type: Date },
  completedAt:    { type: Date },

  attachments:     [{ url: ATTACHMENT_URL, name: String, type: String, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, uploadedAt: { type: Date, default: Date.now } }],
  progressUpdates: [progressUpdateSchema],
  issueReports:    [issueReportSchema],

  submissionNote: { type: String, default: "" },
  reviewNote:     { type: String, default: "" },
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  tags:         [{ type: String }],
  isRecurring:  { type: Boolean, default: false },
  recurringConfig: {
    frequency: { type: String, enum: ["daily", "weekly", "biweekly", "monthly"], default: "monthly" },
    nextRunAt: { type: Date },
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Indexes
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ "assignedTo": 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ category: 1 });

module.exports = mongoose.model("Task", taskSchema);
