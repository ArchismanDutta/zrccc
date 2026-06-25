// controllers/expense.controller.js
const Expense = require("../models/Expense");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { sanitizeSort, parsePagination } = require("../utils/sanitize");

const EXPENSE_SORTS = ["-date", "date", "-amount", "amount", "-createdAt", "createdAt"];

// POST /api/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const { category, description, amount, date } = req.body;
    if (!category || !description || amount == null || !date) {
      throw new ValidationError("category, description, amount, and date are required");
    }

    const expense = await Expense.create({
      category,
      description,
      amount,
      currency: req.body.currency || "INR",
      date,
      vendor: req.body.vendor || "",
      recurring: req.body.recurring || false,
      paidBy: req.body.paidBy || null,
      createdBy: req.user.id,
      notes: req.body.notes || "",
    });

    await logAudit({
      action: "expense.create", entity: "Expense", entityId: expense._id,
      userId: req.user.id, details: { expenseId: expense.expenseId, category, amount }, req,
    });

    created(res, expense);
  } catch (err) { next(err); }
};

// GET /api/expenses
exports.listExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, month, year } = req.query;
    const sort = sanitizeSort(req.query.sort, EXPENSE_SORTS, "-date");
    const filter = {};

    // Non-admin users see only expenses they filed
    if (!["super_admin", "admin"].includes(req.user.role)) {
      filter.createdBy = req.user.id;
    }

    if (category) filter.category = category;

    // Date range filtering by month/year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 50);
    const [docs, total] = await Promise.all([
      Expense.find(filter)
        .populate("paidBy", "name")
        .populate("createdBy", "name")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      Expense.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

function _requireExpenseOwner(expense, user) {
  if (["super_admin", "admin"].includes(user.role)) return;
  if (String(expense.createdBy) !== String(user.id)) throw new ForbiddenError("You can only modify your own expenses");
}

// PATCH /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) throw new NotFoundError("Expense");
    _requireExpenseOwner(expense, req.user);

    const allowed = ["category", "description", "amount", "date", "vendor", "recurring", "paidBy", "notes"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) expense[key] = req.body[key];
    }
    await expense.save();

    await logAudit({
      action: "expense.update", entity: "Expense", entityId: expense._id,
      userId: req.user.id, details: { fields: Object.keys(req.body) }, req,
    });

    success(res, expense);
  } catch (err) { next(err); }
};

// DELETE /api/expenses/:id (hard delete)
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) throw new NotFoundError("Expense");
    _requireExpenseOwner(expense, req.user);

    await Expense.findByIdAndDelete(req.params.id);

    await logAudit({
      action: "expense.delete", entity: "Expense", entityId: expense._id,
      userId: req.user.id, details: { expenseId: expense.expenseId }, req,
    });

    success(res, { message: "Expense deleted" });
  } catch (err) { next(err); }
};
