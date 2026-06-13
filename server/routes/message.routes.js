// routes/message.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const m = require("../controllers/message.controller");

router.use(authenticate);

router.get("/channels",           m.listChannels);
router.post("/channels/direct",   m.getOrCreateDirect);
router.post("/channels/project",  m.getOrCreateProject);
router.get("/:channelId",         m.listMessages);
router.post("/:channelId",        m.sendMessage);

module.exports = router;
