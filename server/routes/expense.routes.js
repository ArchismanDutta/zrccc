// routes/expense.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { PERMISSIONS: P } = require("../config/roles");
const e = require("../controllers/expense.controller");

router.use(authenticate);

router.post("/",     authorize(P.EXPENSE_CREATE), e.createExpense);
router.get("/",      authorize(P.EXPENSE_READ),   e.listExpenses);
router.patch("/:id", authorize(P.EXPENSE_UPDATE), e.updateExpense);
router.delete("/:id", authorize(P.EXPENSE_DELETE), e.deleteExpense);

module.exports = router;
