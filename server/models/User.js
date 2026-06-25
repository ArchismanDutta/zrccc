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

  // Per-device sessions (refresh token hashes + metadata)
  sessions: {
    type: [{
      sessionId:        { type: String },
      refreshTokenHash: { type: String },
      ip:               { type: String, default: "" },
      userAgent:        { type: String, default: "" },
      createdAt:        { type: Date, default: Date.now },
      lastUsedAt:       { type: Date, default: Date.now },
    }],
    default: [],
    select: false,
  },

  // Client portal link (only for role = "client")
  linkedClientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },

  // HR
  salary:       { type: Number, default: 0 },                               // base monthly salary in INR

  // Status
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date, default: null },

  // Brute-force protection
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil:         { type: Date,   default: null },

  // Password history — last 5 hashes, never returned to clients
  passwordHistory: {
    type: [{ hash: { type: String }, changedAt: { type: Date } }],
    default: [],
    select: false,
  },

  // Metadata
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ departmentId: 1 });

// Hash password before save — also enforces password history (no reuse of last 5)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Check new plaintext against stored history hashes
  for (const entry of (this.passwordHistory || [])) {
    const reused = await bcrypt.compare(this.password, entry.hash);
    if (reused) {
      const err = new Error("Cannot reuse one of your last 5 passwords");
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.isOperational = true;
      return next(err);
    }
  }

  // Archive the old hash (passed by the controller via $locals before overwriting)
  const oldHash = this.$locals.oldPasswordHash;
  if (oldHash) {
    this.passwordHistory = [
      { hash: oldHash, changedAt: new Date() },
      ...(this.passwordHistory || []),
    ].slice(0, 5);
  }

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
