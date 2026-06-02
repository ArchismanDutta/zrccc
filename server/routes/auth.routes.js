// routes/auth.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const { loginLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/auth.controller");

router.post("/login",    loginLimiter, auth.login);
router.post("/register", authenticate, auth.register);
router.post("/refresh",  auth.refreshToken);
router.get("/me",        authenticate, auth.getMe);

module.exports = router;
