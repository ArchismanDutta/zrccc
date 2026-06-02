// routes/content.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const c = require("../controllers/content.controller");

router.use(authenticate);

router.post("/",              authorize("content:create"),    c.createContent);
router.get("/",               authorize("content:read"),      c.listContent);
router.get("/pending",        authorize("content:approve"),   c.pendingApproval);
router.get("/:id",            authorize("content:read"),      c.getContent);
router.patch("/:id",          authorize("content:update"),    c.updateContent);
router.patch("/:id/status",   authorize("content:update"),    c.changeStatus);
router.post("/:id/approve",   authorize("content:approve"),   c.approveContent);
router.post("/:id/reject",    authorize("content:approve"),   c.rejectContent);

module.exports = router;
