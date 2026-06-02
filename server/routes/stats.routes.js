// routes/stats.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const s = require("../controllers/stats.controller");

router.use(authenticate);

router.get("/dashboard", s.getDashboard);
router.get("/revenue",   s.getRevenueChart);
router.get("/pl",        s.getProfitLoss);
router.get("/reports",   s.getReports);
router.get("/clients/:id", s.getClientStats);

module.exports = router;
