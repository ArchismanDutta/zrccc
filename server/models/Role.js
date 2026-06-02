// models/Role.js
// Dynamic role model. Roles are DB-driven, not hardcoded enums.
const mongoose = require("mongoose");
const { ROLE_LEVELS } = require("../config/roles");

const roleSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  level:       { type: Number, required: true, min: 1, max: 10 },
  description: { type: String, default: "" },
  department:  { type: String, default: null },
  isSystem:    { type: Boolean, default: false }, // true = cannot be deleted
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

roleSchema.index({ slug: 1 });
roleSchema.index({ level: -1 });

module.exports = mongoose.model("Role", roleSchema);
