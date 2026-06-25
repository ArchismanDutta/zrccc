// routes/message.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const { messageLimiter } = require("../middleware/rateLimiter");
const m = require("../controllers/message.controller");

router.use(authenticate);

router.get("/channels",           m.listChannels);
router.post("/channels/direct",   m.getOrCreateDirect);
router.post("/channels/project",  authorize("projects:read:all", "projects:read:own"), m.getOrCreateProject);
router.get("/:channelId",         m.listMessages);
router.post("/:channelId",        messageLimiter, m.sendMessage);

module.exports = router;
