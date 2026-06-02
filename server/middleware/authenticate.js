// middleware/authenticate.js
// Verifies JWT, checks token version, builds req.user.
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_ACCESS_SECRET } = require("../config/env");
const { AuthenticationError } = require("../utils/errors");
const { ROLE_PERMISSIONS } = require("../config/roles");

// Per-user token-version cache (process-local, TTL 60s)
const versionCache = new Map();
const VERSION_TTL  = 60_000;

async function getDbState(userId) {
  const now = Date.now();
  const cached = versionCache.get(userId);
  if (cached && now - cached.cachedAt < VERSION_TTL) return cached;

  const user = await User.findById(userId)
    .select("tokenVersion isActive role roleLevel linkedClientId grantedPermissions deniedPermissions")
    .lean();
  if (!user) return null;

  const state = {
    tokenVersion:       user.tokenVersion ?? 0,
    isActive:           user.isActive,
    role:               user.role,
    roleLevel:          user.roleLevel ?? 4,
    linkedClientId:     user.linkedClientId ?? null,
    grantedPermissions: user.grantedPermissions || [],
    deniedPermissions:  user.deniedPermissions  || [],
    cachedAt:           now,
  };
  versionCache.set(userId, state);
  return state;
}

function bustTokenCache(userId) {
  versionCache.delete(String(userId));
}

const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AuthenticationError("No token provided"));
    }

    const token = header.split(" ")[1].trim();
    if (!token) return next(new AuthenticationError("Malformed authorization header"));

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

    const dbState = await getDbState(decoded.id);
    if (!dbState)          return next(new AuthenticationError("User account not found"));
    if (!dbState.isActive) return next(new AuthenticationError("Account is deactivated"));
    if ((decoded.tokenVersion ?? 0) !== dbState.tokenVersion) {
      return next(new AuthenticationError("Session invalidated — please log in again"));
    }

    // Compute effective permissions
    const roleSlug = dbState.role;
    let permissions;
    if (roleSlug === "super_admin") {
      const allP = require("../config/roles").PERMISSIONS;
      permissions = Object.values(allP);
    } else {
      const base    = ROLE_PERMISSIONS[roleSlug] || [];
      const granted = dbState.grantedPermissions;
      const denied  = new Set(dbState.deniedPermissions);
      permissions   = [...new Set([...base, ...granted])].filter(p => !denied.has(p));
    }

    req.user = {
      id:             decoded.id,
      email:          decoded.email,
      role:           roleSlug,
      roleLevel:      dbState.roleLevel,
      tokenVersion:   decoded.tokenVersion ?? 0,
      linkedClientId: dbState.linkedClientId,
      permissions,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")  return next(new AuthenticationError("Token expired"));
    if (err.name === "JsonWebTokenError")  return next(new AuthenticationError("Invalid token"));
    next(err);
  }
};

module.exports = authenticate;
module.exports.bustTokenCache = bustTokenCache;
