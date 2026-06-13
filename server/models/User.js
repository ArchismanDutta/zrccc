// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  userId:       { type: String, unique: true },                           // ZRC-USR-00001
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, select: false },
  phone:        { type: String, default: "" },
  avatar:       { type: String, default: "" },

  // Role & department
  role:         { type: String, required: true, lowercase: true },        // slug from Role collection
  roleLevel:    { type: Number, default: 4 },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },

  // Per-user permission overrides
  grantedPermissions: [{ type: String }],
  deniedPermissions:  [{ type: String }],

  // Token versioning — bump to invalidate all existing JWTs
  tokenVersion: { type: Number, default: 0 },

  // Password reset
  passwordResetToken:   { type: String, default: null },
  passwordResetExpires: { type: Date,   default: null },

  // Refresh token rotation (hashed)
  refreshTokenHash: { type: String, default: null, select: false },

  // Client portal link (only for role = "client")
  linkedClientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },

  // HR
  salary:       { type: Number, default: 0 },                               // base monthly salary in INR

  // Status
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date, default: null },

  // Metadata
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ departmentId: 1 });
userSchema.index({ email: 1 });

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip password from JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
