// routes/task.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const t = require("../controllers/task.controller");

router.use(authenticate);

router.post("/",           authorize("tasks:create"),          t.createTask);
router.get("/",            authorize("tasks:read:all", "tasks:read:own"), t.listTasks);
router.get("/:id",         authorize("tasks:read:all", "tasks:read:own"), t.getTask);
router.patch("/:id",       authorize("tasks:update", "tasks:update:own"), t.updateTask);
router.patch("/:id/status", authorize("tasks:update", "tasks:update:own"), t.changeStatus);
router.post("/:id/progress", authorize("tasks:update", "tasks:update:own"), t.addProgressUpdate);
router.post("/:id/issues",   authorize("tasks:update", "tasks:update:own"), t.addIssueReport);
router.post("/:id/review",   authorize("tasks:review"),        t.submitReview);

module.exports = router;
