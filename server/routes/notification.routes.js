// routes/notification.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const n = require("../controllers/notification.controller");

router.use(authenticate);

router.get("/",             n.getMyNotifications);
router.patch("/:id/read",   n.markRead);
router.post("/mark-all-read", n.markAllRead);

module.exports = router;
