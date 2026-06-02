// routes/hr.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { PERMISSIONS: P } = require("../config/roles");
const s = require("../controllers/salary.controller");

router.use(authenticate);

router.get("/employees",              authorize(P.SALARY_READ),              s.getEmployees);
router.patch("/employees/:id/salary", authorize(P.EMPLOYEE_SALARY_UPDATE),   s.updateEmployeeSalary);
router.post("/salaries",                     authorize(P.SALARY_CREATE),        s.createSalaryRecord);
router.get("/salaries/mine",                 s.getMyRecords);                   // Any authenticated user
router.get("/salaries",                      authorize(P.SALARY_READ),          s.listSalaryRecords);
router.patch("/salaries/:id/pay",            authorize(P.SALARY_UPDATE),        s.markSalaryPaid);
router.patch("/salaries/:id/deductions",     authorize(P.SALARY_UPDATE),        s.updateDeductions);
router.get("/salaries/:id/payslip",          s.downloadPayslip);                // Any authenticated user

module.exports = router;
