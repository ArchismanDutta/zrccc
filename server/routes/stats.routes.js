// routes/stats.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const s = require("../controllers/stats.controller");

router.use(authenticate);

router.get("/dashboard",   s.getDashboard);
router.get("/revenue",     s.getRevenueChart);
router.get("/pl",          authorize("finance:dashboard"), s.getProfitLoss);
router.get("/reports",     authorize("reports:read:all"),  s.getReports);
router.get("/clients/:id", s.getClientStats);

module.exports = router;
