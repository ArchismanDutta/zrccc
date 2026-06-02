// middleware/authorize.js
// Permission-based authorization. Used AFTER authenticate.
// Usage: router.get('/path', authenticate, authorize('clients:read:all'), handler)
const { ForbiddenError } = require("../utils/errors");

const authorize = (...requiredPermissions) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("User context missing — run authenticate first"));
    }

    const effective = new Set(req.user.permissions || []);
    const allowed = requiredPermissions.some(perm => effective.has(perm));

    if (!allowed) {
      return next(
        new ForbiddenError(
          `Your role (${req.user.role}) does not have permission: ${requiredPermissions.join(" | ")}`
        )
      );
    }

    next();
  };
};

module.exports = authorize;
