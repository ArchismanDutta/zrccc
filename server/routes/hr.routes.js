// routes/hr.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { PERMISSIONS: P } = require("../config/roles");
const { ForbiddenError } = require("../utils/errors");
const s = require("../controllers/salary.controller");

router.use(authenticate);

router.get("/employees",              authorize(P.SALARY_READ),              s.getEmployees);
router.patch("/employees/:id/salary", authorize(P.EMPLOYEE_SALARY_UPDATE),   s.updateEmployeeSalary);
router.post("/salaries",                     authorize(P.SALARY_CREATE),        s.createSalaryRecord);
router.get("/salaries/mine",                 s.getMyRecords);                   // Any authenticated user
router.get("/salaries",                      authorize(P.SALARY_READ),          s.listSalaryRecords);
router.patch("/salaries/:id/pay",            authorize(P.SALARY_UPDATE),        s.markSalaryPaid);
router.patch("/salaries/:id/deductions",     authorize(P.SALARY_UPDATE),        s.updateDeductions);
router.get("/salaries/:id/payslip", async (req, res, next) => {
  try {
    const SalaryRecord = require("../models/SalaryRecord");
    const record = await SalaryRecord.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ success: false, error: { message: "Not found" } });
    // Must be own payslip OR have hr:salaries:read permission
    const isOwn = String(record.employeeId) === String(req.user.id);
    const hasPermission = req.user.permissions.includes("hr:salaries:read");
    if (!isOwn && !hasPermission) throw new ForbiddenError("Access denied");
    next();
  } catch (err) { next(err); }
}, s.downloadPayslip);

module.exports = router;
