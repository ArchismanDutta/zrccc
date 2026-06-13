// routes/audit.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const audit        = require("../controllers/audit.controller");

router.get("/", authenticate, authorize("audit:read"), audit.listAuditLogs);

module.exports = router;
