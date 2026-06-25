// controllers/user.controller.js
const User = require("../models/User");
const { ROLE_LEVELS, PERMISSIONS } = require("../config/roles");
const VALID_PERMISSIONS = new Set(Object.values(PERMISSIONS));
const { escapeRegex, sanitizeSort, isValidUrl, parsePagination } = require("../utils/sanitize");

const USER_SORTS = ["name", "-name", "email", "-email", "-createdAt", "createdAt"];
const { success, paginated, created } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { bustTokenCache } = require("../middleware/authenticate");
const { validatePassword } = require("../utils/auth-helpers");

const USER_SAFE_SELECT = "-passwordResetToken -passwordResetExpires -tokenVersion -failedLoginAttempts -lockedUntil";
const USER_STRIP_FIELDS = ["password", "passwordResetToken", "passwordResetExpires", "tokenVersion", "failedLoginAttempts", "lockedUntil", "passwordHistory", "sessions"];

function sanitizeUser(userDoc) {
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  for (const f of USER_STRIP_FIELDS) delete obj[f];
  return obj;
}

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, phone, salary, linkedClientId } = req.body;
    if (!name || !email || !password || !role) throw new ValidationError("name, email, password, and role are required");
    validatePassword(password);

    // Client-role users must be linked to a client record
    if (role === "client" && !linkedClientId) {
      throw new ValidationError("linkedClientId is required when creating a client user");
    }

    // Enforce role hierarchy — cannot create a user at or above your own level
    const targetRoleLevel = ROLE_LEVELS[role] ?? 4;
    if (targetRoleLevel >= (req.user.roleLevel ?? 0)) {
      throw new ForbiddenError("Cannot create a user with equal or higher role level than your own");
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw new ValidationError("Email already in use");

    const { nextSequence } = require("../models/Counter");
    const seq = await nextSequence("user");
    const userId = `ZRC-USR-${String(seq).padStart(5, "0")}`;

    const user = await User.create({
      userId, name, email, password,
      role, roleLevel: ROLE_LEVELS[role] ?? 4,
      departmentId: departmentId || null,
      linkedClientId: linkedClientId || null,
      phone: phone || "",
      salary: Number(salary) || 0,
      isActive: true,
    });

    await logAudit({ action: "user.create", entity: "User", entityId: user._id, userId: req.user.id, details: { userId, name, email, role }, req });
    created(res, sanitizeUser(user));
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isActive, departmentId, search } = req.query;
    const sort = sanitizeSort(req.query.sort, USER_SORTS, "name");
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (departmentId) filter.departmentId = departmentId;
    if (search) {
      const s = escapeRegex(search);
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 50);
    const [docs, total] = await Promise.all([
      User.find(filter).select(USER_SAFE_SELECT).populate("departmentId", "displayName slug").sort(sort).skip(skip).limit(safeLimit).lean(),
      User.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(USER_SAFE_SELECT).populate("departmentId", "displayName slug").lean();
    if (!user) throw new NotFoundError("User");
    success(res, user);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError("User");

    const isSelf = String(user._id) === String(req.user.id);

    // Enforce role hierarchy — cannot modify a peer or superior (unless self-update)
    if (!isSelf && (user.roleLevel ?? 0) >= (req.user.roleLevel ?? 0)) {
      throw new ForbiddenError("Cannot modify a user with equal or higher role level");
    }

    // Prevent escalation: only super_admin/admin can change roles
    if (req.body.role && req.user.role !== "super_admin" && req.user.role !== "admin") {
      throw new ForbiddenError("Only admins can change user roles");
    }

    // Self-update: only allow safe personal fields
    const allowed = isSelf ? ["name", "phone", "avatar"] : ["name", "phone", "avatar", "departmentId"];
    if (req.user.role === "super_admin" || req.user.role === "admin") {
      allowed.push("role", "isActive", "grantedPermissions", "deniedPermissions", "departmentId", "linkedClientId");
    }
    if (req.user.role === "super_admin") {
      allowed.push("salary");
    }

    if (req.body.avatar !== undefined && !isValidUrl(req.body.avatar)) {
      throw new ValidationError("avatar must be a valid http/https URL");
    }

    // Validate permission overrides against the canonical set and the caller's own permissions
    if (req.body.grantedPermissions !== undefined) {
      const invalid = req.body.grantedPermissions.filter(p => !VALID_PERMISSIONS.has(p));
      if (invalid.length) throw new ValidationError(`Unknown permissions: ${invalid.join(", ")}`);
      const callerPerms = new Set(req.user.permissions);
      const overreach = req.body.grantedPermissions.filter(p => !callerPerms.has(p));
      if (overreach.length) throw new ForbiddenError(`Cannot grant permissions you do not hold: ${overreach.join(", ")}`);
    }
    if (req.body.deniedPermissions !== undefined) {
      const invalid = req.body.deniedPermissions.filter(p => !VALID_PERMISSIONS.has(p));
      if (invalid.length) throw new ValidationError(`Unknown permissions: ${invalid.join(", ")}`);
    }

    for (const key of allowed) {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    }

    if (req.body.role) user.roleLevel = ROLE_LEVELS[req.body.role] ?? 4;

    // Changing role to client requires a linkedClientId (either provided now or already set)
    if (req.body.role === "client" && !user.linkedClientId) {
      throw new ValidationError("linkedClientId is required when assigning client role");
    }
    if (req.body.isActive === false) {
      user.tokenVersion += 1;  // Force logout on deactivation
      bustTokenCache(user._id.toString());
    }

    await user.save();

    // Use a dedicated action for privilege-sensitive changes so they stand out in the audit log
    const isPrivilegeChange = req.body.role || req.body.grantedPermissions || req.body.deniedPermissions;
    const auditAction = isPrivilegeChange ? "user.privilege_change" : "user.update";
    const auditDetails = { fields: Object.keys(req.body) };
    if (req.body.role) auditDetails.newRole = req.body.role;
    if (req.body.grantedPermissions) auditDetails.grantedPermissions = req.body.grantedPermissions;
    if (req.body.deniedPermissions) auditDetails.deniedPermissions = req.body.deniedPermissions;

    await logAudit({ action: auditAction, entity: "User", entityId: user._id, userId: req.user.id, details: auditDetails, req });
    success(res, sanitizeUser(user));
  } catch (err) { next(err); }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("+sessions");
    if (!user) throw new NotFoundError("User");
    if (user._id.toString() === req.user.id) throw new ForbiddenError("Cannot deactivate yourself");
    if ((user.roleLevel ?? 0) >= (req.user.roleLevel ?? 0)) {
      throw new ForbiddenError("Cannot deactivate a user with equal or higher role level");
    }

    user.isActive = false;
    user.tokenVersion += 1;
    user.sessions = [];
    bustTokenCache(user._id.toString());
    await user.save();

    await logAudit({ action: "user.deactivate", entity: "User", entityId: user._id, userId: req.user.id, req });
    success(res, { message: "User deactivated" });
  } catch (err) { next(err); }
};

exports.toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("+sessions");
    if (!user) throw new NotFoundError("User");
    if (user._id.toString() === req.user.id) throw new ForbiddenError("Cannot change your own active status");
    if ((user.roleLevel ?? 0) >= (req.user.roleLevel ?? 0)) {
      throw new ForbiddenError("Cannot modify a user with equal or higher role level");
    }

    user.isActive = !user.isActive;

    if (!user.isActive) {
      // Full revocation: invalidate all access tokens + wipe every refresh session
      user.tokenVersion += 1;
      user.sessions = [];
      bustTokenCache(user._id.toString());
    }
    // On reactivation, sessions stay empty — user must log in fresh

    await user.save();

    const action = user.isActive ? "user.reactivate" : "user.deactivate";
    await logAudit({ action, entity: "User", entityId: user._id, userId: req.user.id, req });

    success(res, { isActive: user.isActive, message: user.isActive ? "User reactivated" : "User deactivated" });
  } catch (err) { next(err); }
};
