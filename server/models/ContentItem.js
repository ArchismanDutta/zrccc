// models/ContentItem.js
const mongoose = require("mongoose");

const ATTACHMENT_URL = { type: String, match: [/^https?:\/\//, "Attachment URL must start with http:// or https://"] };

const revisionSchema = new mongoose.Schema({
  feedback:  { type: String, required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date, default: Date.now },
  attachments: [{ url: ATTACHMENT_URL, name: String, type: String }],
}, { _id: true });

const contentItemSchema = new mongoose.Schema({
  contentId:  { type: String, unique: true },                               // ZRC-CON-00001
  projectId:  { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  clientId:   { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

  title:       { type: String, required: true, trim: true },
  contentType: {
    type: String,
    enum: [
      "reel", "static_post", "carousel", "story", "video",
      "meta_ad_creative", "banner", "thumbnail", "website_content", "ad_copy",
    ],
    required: true,
  },
  platform: [{
    type: String,
    enum: ["instagram", "facebook", "instagram_story", "facebook_story", "youtube", "website"],
  }],

  caption:      { type: String, default: "" },
  hashtags:     [{ type: String }],
  visualAssets: [{
    url:        { type: String },
    name:       { type: String },
    type:       { type: String },
    size:       { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  }],
  rawFootageUrl: { type: String, default: "" },

  // Meta Ads specific
  adDetails: {
    adObjective:    { type: String, default: "" },
    targetAudience: { type: String, default: "" },
    budget:         { type: Number, default: 0, min: [0, "Ad budget cannot be negative"] },
    adSetName:      { type: String, default: "" },
    campaignName:   { type: String, default: "" },
  },

  // Lifecycle
  status: {
    type: String,
    enum: ["idea", "draft", "in_review", "revision_needed", "approved", "awaiting_client", "scheduled", "published", "cancelled"],
    default: "idea",
  },
  statusHistory: [{
    from:      { type: String },
    to:        { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note:      { type: String, default: "" },
  }],

  // Scheduling
  scheduledAt: { type: Date },
  publishedAt: { type: Date },
  publishedUrl: { type: String, default: "" },

  // Assignment
  assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Review
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt:     { type: Date },
  reviewNotes:    { type: String, default: "" },
  revisionHistory: [revisionSchema],

  // Calendar placement
  plannedMonth: { type: String },   // YYYY-MM
  weekNumber:   { type: Number, min: [1, "weekNumber must be 1–5"], max: [5, "weekNumber must be 1–5"] },   // 1–5
  dayOfWeek:    { type: String },
  postingTime:  { type: String },

  // Flags
  priority:               { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  clientFacing:            { type: Boolean, default: false },
  requiresClientApproval:  { type: Boolean, default: false },
  isAdCreative:            { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Indexes
contentItemSchema.index({ projectId: 1, status: 1 });
contentItemSchema.index({ clientId: 1, plannedMonth: 1 });
contentItemSchema.index({ status: 1, contentType: 1 });
contentItemSchema.index({ "assignedTo": 1 });

module.exports = mongoose.model("ContentItem", contentItemSchema);
