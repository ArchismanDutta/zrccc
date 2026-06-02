// controllers/auth.controller.js
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { nextSequence } = require("../models/Counter");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES } = require("../config/env");
const { ROLE_LEVELS } = require("../config/roles");
const { success, error: sendError } = require("../utils/response");
const { ValidationError, AuthenticationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

function generateTokens(user) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    roleLevel: user.roleLevel,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
  const refreshToken = jwt.sign({ id: user._id, tokenVersion: user.tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

  return { accessToken, refreshToken };
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError("Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) throw new AuthenticationError("Invalid credentials");
    if (!user.isActive) throw new AuthenticationError("Account is deactivated");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AuthenticationError("Invalid credentials");

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = generateTokens(user);

    await logAudit({
      action: "auth.login",
      entity: "User",
      entityId: user._id,
      userId: user._id,
      userName: user.name,
      details: { email: user.email },
      req,
    });

    success(res, {
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        roleLevel: user.roleLevel,
        avatar: user.avatar,
      },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register (admin-only user creation)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, phone } = req.body;
    if (!name || !email || !password || !role) {
      throw new ValidationError("name, email, password, and role are required");
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new ValidationError("Email already registered");

    const seq = await nextSequence("user");
    const userId = `ZRC-USR-${String(seq).padStart(5, "0")}`;

    const roleLevel = ROLE_LEVELS[role] ?? 4;

    const user = await User.create({
      userId,
      name,
      email: email.toLowerCase().trim(),
      password,
      phone: phone || "",
      role,
      roleLevel,
      departmentId: departmentId || null,
      createdBy: req.user?.id || null,
    });

    await logAudit({
      action: "user.create",
      entity: "User",
      entityId: user._id,
      userId: req.user?.id,
      userName: req.user?.name || "system",
      details: { newUserId: userId, role },
      req,
    });

    success(res, { user: user.toJSON() }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError("Refresh token is required");

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new AuthenticationError("Invalid refresh token");
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new AuthenticationError("Session invalidated");
    }

    const tokens = generateTokens(user);
    success(res, tokens);
  } catch (err) {
    if (err.name === "TokenExpiredError") return next(new AuthenticationError("Refresh token expired"));
    if (err.name === "JsonWebTokenError") return next(new AuthenticationError("Invalid refresh token"));
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("departmentId", "displayName slug");
    if (!user) throw new NotFoundError("User");

    success(res, {
      id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      roleLevel: user.roleLevel,
      department: user.departmentId,
      permissions: req.user.permissions,
    });
  } catch (err) {
    next(err);
  }
};
