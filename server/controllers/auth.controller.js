// controllers/auth.controller.js
const crypto = require("crypto");
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { nextSequence } = require("../models/Counter");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, IS_PRODUCTION, FRONTEND_ORIGINS } = require("../config/env");
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

function clearAuthCookies(res) {
  res.clearCookie("accessToken",  { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });
  res.clearCookie("refreshToken", { httpOnly: true, secure: IS_PRODUCTION, sameSite: "strict" });
}

// Creates a new session entry and sets auth cookies. Used at login and after password change.
async function issueTokens(res, user, req) {
  const sessionId = crypto.randomBytes(16).toString("hex");

  const accessPayload = {
    id:           user._id,
    email:        user.email,
    role:         user.role,
    roleLevel:    user.roleLevel,
    tokenVersion: user.tokenVersion,
    sessionId,
  };
  const accessToken  = jwt.sign(accessPayload, JWT_ACCESS_SECRET,  { expiresIn: JWT_ACCESS_EXPIRES  || "15m", algorithm: "HS256" });
  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion, sessionId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES || "7d", algorithm: "HS256" },
  );

  const session = {
    sessionId,
    refreshTokenHash: hashToken(refreshToken),
    ip:               req?.ip || req?.socket?.remoteAddress || "",
    userAgent:        req?.headers?.["user-agent"] || "",
    createdAt:        new Date(),
    lastUsedAt:       new Date(),
  };

  // Keep at most 10 concurrent sessions per user
  await User.updateOne(
    { _id: user._id },
    { $push: { sessions: { $each: [session], $slice: -10 } } },
  );

  res.cookie("accessToken",  accessToken,  cookieOpts(ACCESS_MAX_AGE));
  res.cookie("refreshToken", refreshToken, cookieOpts(REFRESH_MAX_AGE));

  return { accessToken, refreshToken };
}

const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError("Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) throw new AuthenticationError("Invalid credentials");
    if (!user.isActive) throw new AuthenticationError("Account is deactivated");

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw new AuthenticationError(`Account locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw new AuthenticationError("Invalid credentials");
    }

    // Successful login — reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    await issueTokens(res, user, req);

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
    const { name, email, password, role, departmentId, phone, linkedClientId } = req.body;
    if (!name || !email || !password || !role) {
      throw new ValidationError("name, email, password, and role are required");
    }
    validatePassword(password);

    if (role === "client" && !linkedClientId) {
      throw new ValidationError("linkedClientId is required when creating a client user");
    }

    // Enforce role hierarchy — cannot create a user at or above your own level
    const roleLevel = ROLE_LEVELS[role] ?? 4;
    if (roleLevel >= (req.user?.roleLevel ?? 0)) {
      throw new ValidationError("Cannot create a user with equal or higher role level than your own");
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new ValidationError("Email already registered");

    const seq = await nextSequence("user");
    const userId = `ZRC-USR-${String(seq).padStart(5, "0")}`;

    const user = await User.create({
      userId,
      name,
      email: email.toLowerCase().trim(),
      password,
      phone: phone || "",
      role,
      roleLevel,
      departmentId: departmentId || null,
      linkedClientId: role === "client" ? linkedClientId : null,
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

    success(res, {
      user: {
        id:          user._id,
        userId:      user.userId,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        roleLevel:   user.roleLevel,
        isActive:    user.isActive,
        departmentId: user.departmentId,
        phone:       user.phone,
        avatar:      user.avatar,
        createdAt:   user.createdAt,
      },
    }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) throw new AuthenticationError("No refresh token");

    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
    } catch (e) {
      if (e.name === "TokenExpiredError") throw new AuthenticationError("Refresh token expired");
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findById(decoded.id).select("+sessions");
    if (!user || !user.isActive) throw new AuthenticationError("Invalid refresh token");
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) throw new AuthenticationError("Session invalidated");

    const sessions = user.sessions || [];
    const sessionIndex = sessions.findIndex(s => s.sessionId === decoded.sessionId);

    if (sessionIndex === -1) {
      // Session was explicitly revoked — clear cookies but don't nuke other sessions
      clearAuthCookies(res);
      throw new AuthenticationError("Session revoked");
    }

    const incoming = hashToken(oldRefreshToken);
    const incomingBuf = Buffer.from(incoming, "hex");
    const storedBuf   = Buffer.from(sessions[sessionIndex].refreshTokenHash, "hex");
    const hashMismatch = incomingBuf.length !== storedBuf.length ||
      !crypto.timingSafeEqual(incomingBuf, storedBuf);
    if (hashMismatch) {
      // Token reuse with known sessionId — definite theft, kill everything
      user.tokenVersion += 1;
      user.sessions = [];
      await user.save();
      bustTokenCache(String(user._id));
      clearAuthCookies(res);
      throw new AuthenticationError("Session invalidated due to token reuse");
    }

    // Valid — rotate tokens, updating the session record in place with a new sessionId
    const newSessionId = crypto.randomBytes(16).toString("hex");
    const newAccessPayload = {
      id:           user._id,
      email:        user.email,
      role:         user.role,
      roleLevel:    user.roleLevel,
      tokenVersion: user.tokenVersion,
      sessionId:    newSessionId,
    };
    const newAccessToken  = jwt.sign(newAccessPayload, JWT_ACCESS_SECRET,  { expiresIn: JWT_ACCESS_EXPIRES  || "15m", algorithm: "HS256" });
    const newRefreshToken = jwt.sign(
      { id: user._id, tokenVersion: user.tokenVersion, sessionId: newSessionId },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES || "7d", algorithm: "HS256" },
    );

    await User.updateOne(
      { _id: user._id, "sessions.sessionId": decoded.sessionId },
      { $set: {
          "sessions.$.sessionId":        newSessionId,
          "sessions.$.refreshTokenHash": hashToken(newRefreshToken),
          "sessions.$.lastUsedAt":       new Date(),
      }},
    );

    res.cookie("accessToken",  newAccessToken,  cookieOpts(ACCESS_MAX_AGE));
    res.cookie("refreshToken", newRefreshToken, cookieOpts(REFRESH_MAX_AGE));
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
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
        // Remove only this device's session
        await User.updateOne(
          { _id: decoded.id },
          { $pull: { sessions: { sessionId: decoded.sessionId } } },
        );
        bustTokenCache(String(decoded.id));
      } catch (_) { /* expired or invalid — still clear cookies */ }
    }
    clearAuthCookies(res);
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
    // Always return 200 to not leak whether email exists or account is deactivated
    if (!user || !user.isActive) return success(res, { ok: true });

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
    }).select("+passwordHistory");

    if (!user) throw new ValidationError("Invalid or expired reset token");
    if (!user.isActive) throw new AuthenticationError("Account is deactivated");

    user.password             = newPassword;
    user.passwordResetToken   = null;
    user.passwordResetExpires = null;
    user.tokenVersion        += 1;
    await user.save();

    // Clear all sessions via updateOne so we don't need to select +sessions
    await User.updateOne({ _id: user._id }, { $set: { sessions: [] } });

    bustTokenCache(String(user._id));

    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new ValidationError("currentPassword and newPassword are required");
    validatePassword(newPassword); // throws ValidationError if invalid

    const user = await User.findById(req.user.id).select("+password +passwordHistory");
    if (!user) throw new NotFoundError("User");

    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw new AuthenticationError("Current password is incorrect");

    user.$locals.oldPasswordHash = user.password;
    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();

    // Clear all sessions (including current), then issue one fresh session below
    await User.updateOne({ _id: user._id }, { $set: { sessions: [] } });

    bustTokenCache(String(user._id));

    // Re-issue tokens so the current session stays alive
    await issueTokens(res, user, req);

    await logAudit({ action: "auth.change_password", entity: "User", entityId: user._id, userId: req.user.id, req });
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/revoke-all-sessions
exports.revokeAllSessions = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $inc: { tokenVersion: 1 }, $set: { sessions: [] } },
    );

    bustTokenCache(String(req.user.id));
    clearAuthCookies(res);

    await logAudit({ action: "auth.revoke_all_sessions", entity: "User", entityId: req.user.id, userId: req.user.id, req });
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/sessions
exports.getSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+sessions");
    if (!user) throw new NotFoundError("User");

    const sessions = (user.sessions || [])
      .map(s => ({
        sessionId:  s.sessionId,
        ip:         s.ip,
        userAgent:  s.userAgent,
        createdAt:  s.createdAt,
        lastUsedAt: s.lastUsedAt,
        isCurrent:  s.sessionId === req.user.sessionId,
      }))
      .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));

    success(res, { sessions });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/sessions/:sessionId
// PATCH /api/auth/profile — any authenticated user can update their own safe fields
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError("User");

    const { name, phone, avatar } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) throw new ValidationError("name must be a non-empty string");
      user.name = name.trim();
    }
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) {
      const { isValidUrl } = require("../utils/sanitize");
      if (avatar && !isValidUrl(avatar)) throw new ValidationError("avatar must be a valid http/https URL");
      user.avatar = avatar;
    }

    await user.save();
    await logAudit({ action: "user.profile_update", entity: "User", entityId: user._id, userId: req.user.id, details: { fields: Object.keys(req.body) }, req });

    success(res, { id: user._id, name: user.name, phone: user.phone, avatar: user.avatar });
  } catch (err) {
    next(err);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (sessionId === req.user.sessionId) {
      throw new ValidationError("Use logout to end your current session");
    }

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { sessions: { sessionId } } },
    );

    await logAudit({ action: "auth.revoke_session", entity: "User", entityId: req.user.id, userId: req.user.id, details: { sessionId }, req });
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
};
