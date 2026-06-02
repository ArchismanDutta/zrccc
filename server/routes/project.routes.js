// routes/project.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const p = require("../controllers/project.controller");

router.use(authenticate);

router.post("/",           authorize("projects:create"),      p.createProject);
router.get("/",            authorize("projects:read:all", "projects:read:own"), p.listProjects);
router.get("/:id",         authorize("projects:read:all", "projects:read:own"), p.getProject);
router.patch("/:id",       authorize("projects:update"),      p.updateProject);
router.patch("/:id/status", authorize("projects:update"),     p.changeStatus);
router.post("/:id/team",   authorize("projects:manage-team"), p.addTeamMember);
router.delete("/:id/team/:userId", authorize("projects:manage-team"), p.removeTeamMember);
router.post("/:id/milestones",                    authorize("projects:update"), p.addMilestone);
router.patch("/:id/milestones/:milestoneId",      authorize("projects:update"), p.toggleMilestone);
router.delete("/:id",      authorize("projects:delete"),      p.archiveProject);

module.exports = router;
