// routes/auth.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const { loginLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/auth.controller");

router.post("/login",                loginLimiter, auth.login);
router.post("/register",             authenticate, authorize("users:create"), auth.register);
router.post("/refresh",              auth.refreshToken);
router.post("/logout",               auth.logout);
router.get( "/me",                   authenticate, auth.getMe);
router.post("/forgot-password",      auth.forgotPassword);
router.post("/reset-password",       auth.resetPassword);
router.post("/revoke-all-sessions",  authenticate, auth.revokeAllSessions);

module.exports = router;
