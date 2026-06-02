// controllers/user.controller.js
const User = require("../models/User");
const { ROLE_LEVELS } = require("../config/roles");
const { success, paginated, created } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { bustTokenCache } = require("../middleware/authenticate");

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, phone, salary } = req.body;
    if (!name || !email || !password || !role) throw new ValidationError("name, email, password, and role are required");

    const existing = await User.findOne({ email });
    if (existing) throw new ValidationError("Email already in use");

    const { nextSequence } = require("../models/Counter");
    const seq = await nextSequence("user");
    const userId = `ZRC-USR-${String(seq).padStart(5, "0")}`;

    const user = await User.create({
      userId, name, email, password,
      role, roleLevel: ROLE_LEVELS[role] ?? 4,
      departmentId: departmentId || null,
      phone: phone || "",
      salary: Number(salary) || 0,
      isActive: true,
    });

    await logAudit({ action: "user.create", entity: "User", entityId: user._id, userId: req.user.id, details: { userId, name, email, role }, req });
    const safe = user.toObject(); delete safe.password;
    created(res, safe);
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isActive, departmentId, search, sort = "name" } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (departmentId) filter.departmentId = departmentId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      User.find(filter).populate("departmentId", "displayName slug").sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("departmentId", "displayName slug").lean();
    if (!user) throw new NotFoundError("User");
    success(res, user);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError("User");

    // Prevent escalation: only super_admin can change roles
    if (req.body.role && req.user.role !== "super_admin" && req.user.role !== "admin") {
      throw new ForbiddenError("Only admins can change user roles");
    }

    const allowed = ["name", "phone", "avatar", "departmentId"];
    if (req.user.role === "super_admin" || req.user.role === "admin") {
      allowed.push("role", "isActive", "grantedPermissions", "deniedPermissions");
    }
    if (req.user.role === "super_admin") {
      allowed.push("salary");
    }

    for (const key of allowed) {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    }

    if (req.body.role) user.roleLevel = ROLE_LEVELS[req.body.role] ?? 4;
    if (req.body.isActive === false) {
      user.tokenVersion += 1;  // Force logout on deactivation
      bustTokenCache(user._id.toString());
    }

    await user.save();
    await logAudit({ action: "user.update", entity: "User", entityId: user._id, userId: req.user.id, details: { fields: Object.keys(req.body) }, req });
    success(res, user);
  } catch (err) { next(err); }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError("User");
    if (user._id.toString() === req.user.id) throw new ForbiddenError("Cannot deactivate yourself");

    user.isActive = false;
    user.tokenVersion += 1;
    bustTokenCache(user._id.toString());
    await user.save();

    await logAudit({ action: "user.deactivate", entity: "User", entityId: user._id, userId: req.user.id, req });
    success(res, { message: "User deactivated" });
  } catch (err) { next(err); }
};
