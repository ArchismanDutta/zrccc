// models/Project.js
const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectRole: { type: String, default: "" },   // their function within this project
  addedAt:     { type: Date, default: Date.now },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  dueDate:     { type: Date },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { _id: true });

const statusChangeSchema = new mongoose.Schema({
  from:      { type: String },
  to:        { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason:    { type: String, default: "" },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  projectId:   { type: String, unique: true },                              // ZRC-PRJ-00001
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },

  type: [{
    type: String,
    enum: [
      "social_media_management", "meta_ads", "reels", "graphics", "carousels",
      "video_production", "website_development", "website_maintenance",
      "photography", "content_writing", "custom",
    ],
  }],

  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

  status: {
    type: String,
    enum: ["planning", "active", "on_hold", "completed", "cancelled"],
    default: "planning",
  },
  priority: { type: String, enum: ["low", "medium", "high", "urgent", "critical"], default: "medium" },

  startDate: { type: Date },
  endDate:   { type: Date },

  projectManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teamMembers:      [teamMemberSchema],
  milestones:       [milestoneSchema],

  overallProgress: { type: Number, min: 0, max: 100, default: 0 },

  budget:   { type: Number, default: 0, min: [0, "Budget cannot be negative"] },
  currency: { type: String, enum: ["INR", "USD", "AED", "GBP"], default: "INR" },

  statusHistory: [statusChangeSchema],
  cancelReason:  { type: String, default: "" },
  tags:          [{ type: String }],

  isArchived: { type: Boolean, default: false },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Indexes
projectSchema.index({ clientId: 1 });
projectSchema.index({ projectManagerId: 1 });
projectSchema.index({ status: 1, isArchived: 1 });
projectSchema.index({ "teamMembers.userId": 1 });

module.exports = mongoose.model("Project", projectSchema);
