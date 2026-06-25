// models/Client.js
const mongoose = require("mongoose");

const statusChangeSchema = new mongoose.Schema({
  from:      { type: String },
  to:        { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason:    { type: String, default: "" },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const ownershipChangeSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  to:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason:    { type: String, default: "" },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const contractSchema = new mongoose.Schema({
  monthlyValue: { type: Number, default: 0, min: [0, "Monthly value cannot be negative"] },
  currency:     { type: String, enum: ["INR", "USD", "AED", "GBP"], default: "INR" },
  billingCycle: { type: String, enum: ["monthly", "quarterly", "annually", "one_time"], default: "monthly" },
  startDate:    { type: Date },
  endDate:      { type: Date },
  autoRenew:    { type: Boolean, default: false },
  totalValue:   { type: Number, default: 0, min: [0, "Total value cannot be negative"] },
  terms:        { type: String, default: "" },
}, { _id: false });

const clientSchema = new mongoose.Schema({
  clientId:     { type: String, unique: true },                             // ZRC-CLT-00001
  companyName:  { type: String, required: true, trim: true },
  displayName:  { type: String, trim: true },
  contactName:  { type: String, trim: true },
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: { type: String, default: "" },
  website:      { type: String, default: "" },
  industry:     { type: String, default: "" },
  region:       { type: String, enum: ["north_india", "south_india", "east_india", "west_india", "international", ""], default: "" },
  gstNumber:    { type: String, default: "" },
  panNumber:    { type: String, default: "" },
  billingAddress: { type: String, default: "" },
  logo:         { type: String, default: "" },

  // Lifecycle
  status: {
    type: String,
    enum: ["prospect", "onboarding", "active", "paused", "churned", "reactivated"],
    default: "prospect",
  },
  statusHistory: [statusChangeSchema],

  // Services
  services: [{
    type: String,
    enum: [
      "social_media_management", "meta_ads", "reels", "graphics", "carousels",
      "video_production", "website_development", "website_maintenance",
      "content_writing", "photography",
    ],
  }],

  // Contract
  contract: { type: contractSchema, default: () => ({}) },

  // Ownership
  accountManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  enteredBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ownershipHistory: [ownershipChangeSchema],

  // Engagement
  priority:      { type: String, enum: ["low", "medium", "high", "vip"], default: "medium" },
  healthScore:   { type: Number, min: 0, max: 100, default: 80 },
  tags:          [{ type: String }],
  notes:         { type: String, default: "" },
  lastContactedAt: { type: Date },
  nextFollowUpAt:  { type: Date },
  churnReason:   { type: String, default: "" },

  // Social media metrics history
  socialMetrics: [{
    platform:   { type: String, enum: ["instagram", "facebook", "youtube", "linkedin"], required: true },
    count:      { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],

  // Soft delete
  isArchived:    { type: Boolean, default: false },
}, { timestamps: true });

// Indexes
clientSchema.index({ status: 1, isArchived: 1 });
clientSchema.index({ accountManagerId: 1 });
clientSchema.index({ companyName: "text", displayName: "text", contactName: "text" });
clientSchema.index({ "contract.endDate": 1 });

module.exports = mongoose.model("Client", clientSchema);
