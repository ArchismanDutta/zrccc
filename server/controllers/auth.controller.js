// controllers/auth.controller.js
const crypto = require("crypto");
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { nextSequence } = require("../models/Counter");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, RESET_TOKEN_SECRET, IS_PRODUCTION, FRONTEND_ORIGINS } = require("../config/env");
const { ROLE_LEVELS } = require("../config/roles");
const { success, error: sendError } = require("../utils/response");
const { ValidationError, AuthenticationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { bustTokenCache } = require("../middleware/authenticate");
const { sendPasswordResetEmail } = require("../utils/mailer");
const { hashToken, parseExpiry, validatePassword } = require("../utils/auth-helpers");

const ACCESS_MAX_AGE  = parseExpiry(JWT_ACCESS_EXPIRES  || "15m");
const REFRESH_MAX_AGE = parseExpiry(JWT_REFRESH_EXPIRES || "7d");

function cookieOpts(maxAge) {
  return {
    httpOnly:  true,
    secure:    IS_PRODUCTION,
    sameSite:  "strict",
    maxAge,
  };
}

async function issueTokens(res, user) {
  const payload = {
    id:           user._id,
    email:        user.email,
    role:         user.role,
    roleLevel:    user.roleLevel,
    tokenVersion: user.tokenVersion,
  };
  const accessToken  = jwt.sign(payload, JWT_ACCESS_SECRET,  { expiresIn: JWT_ACCESS_EXPIRES  || "15m" });
  const refreshToken = jwt.sign({ id: user._id, tokenVersion: user.tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES || "7d" });

  // Store hash of refresh token for rotation/theft detection
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });

  res.cookie("accessToken",  accessToken,  cookieOpts(ACCESS_MAX_AGE));
  res.cookie("refreshToken", refreshToken, cookieOpts(REFRESH_MAX_AGE));

  return { accessToken, refreshToken };
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError("Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password +refreshTokenHash");
    if (!user) throw new AuthenticationError("Invalid credentials");
    if (!user.isActive) throw new AuthenticationError("Account is deactivated");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AuthenticationError("Invalid credentials");

    user.lastLoginAt = new Date();
    await user.save();

    await issueTokens(res, user);

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
        id:        user._id,
        userId:    user.userId,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        roleLevel: user.roleLevel,
        avatar:    user.avatar,
      },
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
    validatePassword(password);

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
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AuthenticationError("No refresh token");

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      if (e.name === "TokenExpiredError") throw new AuthenticationError("Refresh token expired");
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user || !user.isActive) throw new AuthenticationError("Invalid refresh token");
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) throw new AuthenticationError("Session invalidated");

    // Rotation theft detection
    const incoming = hashToken(refreshToken);
    if (user.refreshTokenHash && incoming !== user.refreshTokenHash) {
      // Token reuse detected — invalidate all sessions
      user.tokenVersion += 1;
      user.refreshTokenHash = null;
      await user.save();
      bustTokenCache(String(user._id));
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      throw new AuthenticationError("Session invalidated due to token reuse");
    }

    await issueTokens(res, user);
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        await User.updateOne({ _id: decoded.id }, { $inc: { tokenVersion: 1 }, refreshTokenHash: null });
        bustTokenCache(String(decoded.id));
      } catch (_) { /* expired or invalid — still clear cookies */ }
    }
    res.clearCookie("accessToken",  { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("departmentId", "displayName slug");
    if (!user) throw new NotFoundError("User");
    success(res, {
      id:          user._id,
      userId:      user.userId,
      name:        user.name,
      email:       user.email,
      phone:       user.phone,
      avatar:      user.avatar,
      role:        user.role,
      roleLevel:   user.roleLevel,
      department:  user.departmentId,
      permissions: req.user.permissions,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError("Email is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to not leak whether email exists
    if (!user) return success(res, { ok: true });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendOrigin = FRONTEND_ORIGINS[0] || "http://localhost:5173";
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(user, resetUrl);

    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw new ValidationError("Token and new password are required");

    validatePassword(newPassword);

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw new ValidationError("Invalid or expired reset token");

    user.password             = newPassword;
    user.passwordResetToken   = null;
    user.passwordResetExpires = null;
    user.tokenVersion        += 1;
    user.refreshTokenHash     = null;
    await user.save();

    bustTokenCache(String(user._id));

    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/revoke-all-sessions
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError("User");

    user.tokenVersion    += 1;
    user.refreshTokenHash = null;
    await user.save();

    bustTokenCache(String(user._id));

    res.clearCookie("accessToken",  { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });

    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};
