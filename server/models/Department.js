// models/Department.js
const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  headUserId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  description: { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Department", departmentSchema);
