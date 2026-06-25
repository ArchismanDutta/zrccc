// routes/user.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const u = require("../controllers/user.controller");

router.use(authenticate);

router.post("/",          authorize("users:create"),         u.createUser);
router.get("/",           authorize("users:read:all"),       u.listUsers);
router.get("/:id",        authorize("users:read:all"),       u.getUser);
router.patch("/:id",               authorize("users:update"),  u.updateUser);
router.post("/:id/deactivate",     authorize("users:delete"),  u.deactivateUser);
router.patch("/:id/toggle-active", authorize("users:delete"),  u.toggleUserActive);

module.exports = router;
