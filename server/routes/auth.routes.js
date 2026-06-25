// routes/auth.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const { loginLimiter, refreshLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/auth.controller");

router.post("/login",                loginLimiter, auth.login);
router.post("/register",             authenticate, authorize("users:create"), auth.register);
router.post("/refresh",              refreshLimiter, auth.refreshToken);
router.post("/logout",               auth.logout);
router.get( "/me",                   authenticate, auth.getMe);
router.patch("/profile",             authenticate, auth.updateProfile);
router.post("/forgot-password",      loginLimiter, auth.forgotPassword);
router.post("/reset-password",       loginLimiter, auth.resetPassword);
router.post("/change-password",       loginLimiter, authenticate, auth.changePassword);
router.post("/revoke-all-sessions",  authenticate, auth.revokeAllSessions);
router.get( "/sessions",             authenticate, auth.getSessions);
router.delete("/sessions/:sessionId", authenticate, auth.revokeSession);

module.exports = router;
