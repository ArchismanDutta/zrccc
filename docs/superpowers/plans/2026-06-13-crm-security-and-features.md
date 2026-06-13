# ZRC CRM — Security Hardening + Full Feature Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security vulnerabilities, access control gaps, and logic bugs in the ZRC CRM, then add password reset, session management, account manager reassignment, and real-time messaging.

**Architecture:** Server-side httpOnly cookie auth replaces localStorage tokens. Unprotected routes get authorization guards. Logic bugs are patched in-place. New features (password reset, messaging) follow the existing controller/route/model pattern.

**Tech Stack:** Node.js + Express + MongoDB/Mongoose + React + Vite + Socket.io (new) + supertest (new, dev)

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `server/utils/sanitize.js` | HTML entity escaping for email content |
| `server/models/Message.js` | Chat message document |
| `server/models/Channel.js` | Chat channel (direct or project) |
| `server/controllers/message.controller.js` | Message CRUD + channel listing |
| `server/routes/message.routes.js` | `/api/messages` routes |
| `server/tests/auth.test.js` | Route tests for auth endpoints |
| `server/tests/access.test.js` | Route tests for access control |
| `client/src/pages/ForgotPassword.jsx` | Forgot password form |
| `client/src/pages/ResetPassword.jsx` | Reset password form |
| `client/.env` | `VITE_API_URL` |
| `client/.env.production` | Production `VITE_API_URL` |

### Modified Files
| File | What Changes |
|------|-------------|
| `server/package.json` | Add `supertest` devDependency |
| `server/config/env.js` | Add `RESET_TOKEN_SECRET`, validate mail in prod |
| `server/models/User.js` | Add `passwordResetToken`, `passwordResetExpires` |
| `server/middleware/authenticate.js` | Read token from cookie OR Authorization header |
| `server/controllers/auth.controller.js` | httpOnly cookies, rotation, logout, forgot/reset |
| `server/controllers/project.controller.js` | Fix `milestone.completed` → `milestone.isCompleted` |
| `server/controllers/salary.controller.js` | Fix `record.deductions.toLocaleString` bug |
| `server/controllers/finance.controller.js` | `listPayments` scoping + invoice PDF ownership |
| `server/controllers/client.controller.js` | Ownership checks + `accountManagerId` in allowed |
| `server/controllers/stats.controller.js` | Client stats ownership check |
| `server/routes/auth.routes.js` | Add logout/forgot/reset; authorize on register |
| `server/routes/stats.routes.js` | Add authorize guards to dashboard + revenue |
| `server/routes/hr.routes.js` | Payslip ownership middleware |
| `server/app.js` | Register message routes |
| `server/server.js` | Attach Socket.io |
| `server/utils/mailer.js` | `escapeHtml` applied to all user content |
| `client/src/lib/api.js` | `VITE_API_URL`, `credentials:'include'`, no localStorage tokens |
| `client/src/lib/auth.jsx` | Remove localStorage token handling |
| `client/src/App.jsx` | Fix route guards + add ForgotPassword/ResetPassword routes |
| `client/src/pages/Login.jsx` | Add "Forgot password?" link |
| `client/src/pages/Messages.jsx` | Real Socket.io chat implementation |
| `client/src/pages/Settings.jsx` | Add Security tab with revoke-all-sessions |

---

## Phase 1: Foundation

### Task 1: Install server dev dependencies + create HTML sanitize utility

**Files:**
- Modify: `server/package.json`
- Create: `server/utils/sanitize.js`
- Create: `server/tests/sanitize.test.js`

- [ ] **Step 1: Install supertest**

```bash
cd server && npm install --save-dev supertest
```

Expected output: `added N packages`

- [ ] **Step 2: Write the failing test for escapeHtml**

Create `server/tests/sanitize.test.js`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../utils/sanitize");

test("escapeHtml: escapes angle brackets", () => {
  assert.equal(escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapeHtml: escapes ampersand", () => {
  assert.equal(escapeHtml("a & b"), "a &amp; b");
});

test("escapeHtml: escapes double quotes", () => {
  assert.equal(escapeHtml(`say "hello"`), "say &quot;hello&quot;");
});

test("escapeHtml: escapes single quotes", () => {
  assert.equal(escapeHtml("it's"), "it&#039;s");
});

test("escapeHtml: passes through safe strings unchanged", () => {
  assert.equal(escapeHtml("Hello ZRC Media"), "Hello ZRC Media");
});

test("escapeHtml: handles null/undefined gracefully", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});
```

- [ ] **Step 3: Run the test — verify it fails**

```bash
cd server && node --test tests/sanitize.test.js
```

Expected: `Cannot find module '../utils/sanitize'`

- [ ] **Step 4: Create `server/utils/sanitize.js`**

```js
// utils/sanitize.js
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { escapeHtml };
```

- [ ] **Step 5: Run the test — verify it passes**

```bash
cd server && node --test tests/sanitize.test.js
```

Expected: `▶ 6 tests pass`

- [ ] **Step 6: Commit**

```bash
git add server/utils/sanitize.js server/tests/sanitize.test.js server/package.json server/package-lock.json
git commit -m "feat: add HTML sanitize utility and supertest dev dependency"
```

---

### Task 2: Apply escapeHtml to all email templates

**Files:**
- Modify: `server/utils/mailer.js`

- [ ] **Step 1: Add escapeHtml import and apply to all user-supplied content**

Replace the top of `server/utils/mailer.js` (after the requires) by adding the import, then wrap every user-controlled string in email HTML bodies.

At line 4, add:
```js
const { escapeHtml } = require("./sanitize");
```

In `sendInvoiceEmail` (line 55), change:
```js
<p>Dear ${client.contactName || client.companyName},</p>
```
to:
```js
<p>Dear ${escapeHtml(client.contactName || client.companyName)},</p>
```

In `sendTicketReplyEmail` (line 200–202), change:
```js
          ${reply.message}
```
to:
```js
          ${escapeHtml(reply.message)}
```

Also escape in `sendNewTicketEmail` (line 180):
```js
        <p style="padding: 15px; background: #f9f9f9; border-radius: 8px;">${escapeHtml(ticket.description)}</p>
```

And in `sendPaymentReminderEmail` (line 87) — `client.contactName` and `client.companyName` are already string values but escape them anyway:
```js
<p>Dear ${escapeHtml(client.contactName || client.companyName)},</p>
```

And in `sendPaymentReceivedEmail` (line 109):
```js
<p>Dear ${escapeHtml(client.contactName || client.companyName)},</p>
```

And in `sendSalaryPaidEmail` (line 149):
```js
<p>Dear ${escapeHtml(employee.name)},</p>
```

- [ ] **Step 2: Verify server still starts**

```bash
cd server && node -e "require('./utils/mailer'); console.log('ok')"
```

Expected: `ok` (or the mail-not-configured warning — both are fine)

- [ ] **Step 3: Commit**

```bash
git add server/utils/mailer.js
git commit -m "security: escape HTML entities in all outgoing email templates"
```

---

### Task 3: Update env config — add RESET_TOKEN_SECRET

**Files:**
- Modify: `server/config/env.js`

- [ ] **Step 1: Add RESET_TOKEN_SECRET to required list and exports**

Replace `server/config/env.js` entirely:

```js
// config/env.js
require("dotenv").config();

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "RESET_TOKEN_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required env variables: ${missing.join(", ")}`);
  process.exit(1);
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (IS_PRODUCTION && process.env.MAIL_SECURE !== "true") {
  console.warn("⚠️ MAIL_SECURE is not 'true' in production — SMTP connections may be unencrypted");
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5001", 10),
  MONGODB_URI: process.env.MONGODB_URI,

  JWT_ACCESS_SECRET:    process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET:   process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES:   process.env.JWT_ACCESS_EXPIRES  || "15m",
  JWT_REFRESH_EXPIRES:  process.env.JWT_REFRESH_EXPIRES || "7d",
  RESET_TOKEN_SECRET:   process.env.RESET_TOKEN_SECRET,

  FRONTEND_ORIGINS: (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",
  IS_PRODUCTION,

  MAIL_SECURE: process.env.MAIL_SECURE === "true",
};
```

- [ ] **Step 2: Add RESET_TOKEN_SECRET to server `.env` file**

Open `server/.env` and add:
```
RESET_TOKEN_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

Run the generator:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Paste the output as the value.

- [ ] **Step 3: Verify server loads cleanly**

```bash
cd server && node -e "require('./config/env'); console.log('env ok')"
```

Expected: `env ok`

- [ ] **Step 4: Commit**

```bash
git add server/config/env.js
git commit -m "feat: add RESET_TOKEN_SECRET to env config and production SMTP TLS warning"
```

---

## Phase 2: Authentication Hardening

### Task 4: Migrate auth to httpOnly cookies

**Files:**
- Modify: `server/controllers/auth.controller.js`

- [ ] **Step 1: Write test file for auth cookie behavior**

Create `server/tests/auth.test.js`:

```js
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const TEST_MONGO = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

before(async () => {
  await mongoose.connect(TEST_MONGO);
});

after(async () => {
  await mongoose.disconnect();
});

test("POST /api/auth/login: sets httpOnly cookie on success", async () => {
  // Assumes seed user exists: email=admin@zrc.com, password=Admin@123
  const res = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@zrc.com", password: "Admin@123" });

  assert.equal(res.status, 200);
  const cookies = res.headers["set-cookie"] || [];
  assert.ok(cookies.some(c => c.includes("accessToken")), "accessToken cookie not set");
  assert.ok(cookies.some(c => c.toLowerCase().includes("httponly")), "cookie not httpOnly");
});

test("POST /api/auth/login: does NOT expose tokens in response body", async () => {
  const res = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@zrc.com", password: "Admin@123" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data?.accessToken, undefined, "accessToken leaked in body");
  assert.equal(res.body.data?.refreshToken, undefined, "refreshToken leaked in body");
});

test("GET /api/auth/me: works with cookie", async () => {
  const loginRes = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@zrc.com", password: "Admin@123" });

  const cookies = loginRes.headers["set-cookie"];
  const meRes = await supertest(app)
    .get("/api/auth/me")
    .set("Cookie", cookies);

  assert.equal(meRes.status, 200);
  assert.ok(meRes.body.data?.email);
});

test("POST /api/auth/logout: clears cookies", async () => {
  const loginRes = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@zrc.com", password: "Admin@123" });

  const cookies = loginRes.headers["set-cookie"];
  const logoutRes = await supertest(app)
    .post("/api/auth/logout")
    .set("Cookie", cookies);

  assert.equal(logoutRes.status, 200);
  const logoutCookies = logoutRes.headers["set-cookie"] || [];
  assert.ok(logoutCookies.some(c => c.includes("accessToken=;")), "accessToken not cleared");
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd server && node --test tests/auth.test.js
```

Expected: Tests fail — either connection errors or cookie assertions fail.

- [ ] **Step 3: Rewrite `auth.controller.js`**

Replace `server/controllers/auth.controller.js` entirely:

```js
// controllers/auth.controller.js
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const User   = require("../models/User");
const { nextSequence } = require("../models/Counter");
const {
  JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES,
  RESET_TOKEN_SECRET, IS_PRODUCTION,
} = require("../config/env");
const { ROLE_LEVELS } = require("../config/roles");
const { success, error: sendError } = require("../utils/response");
const { ValidationError, AuthenticationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { bustTokenCache } = require("../middleware/authenticate");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "strict" : "lax",
  path: "/",
};

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("accessToken",  accessToken,  { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie("accessToken",  { ...COOKIE_OPTIONS });
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS });
}

function generateTokens(user) {
  const payload = {
    id: user._id, email: user.email,
    role: user.role, roleLevel: user.roleLevel,
    tokenVersion: user.tokenVersion,
  };
  const accessToken  = jwt.sign(payload, JWT_ACCESS_SECRET,  { expiresIn: JWT_ACCESS_EXPIRES });
  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
  return { accessToken, refreshToken };
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new ValidationError("Password must contain at least one number or special character");
  }
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError("Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user)         throw new AuthenticationError("Invalid credentials");
    if (!user.isActive) throw new AuthenticationError("Account is deactivated");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AuthenticationError("Invalid credentials");

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    await logAudit({
      action: "auth.login", entity: "User", entityId: user._id,
      userId: user._id, userName: user.name, details: { email: user.email }, req,
    });

    success(res, {
      user: {
        id: user._id, userId: user.userId, name: user.name,
        email: user.email, role: user.role, roleLevel: user.roleLevel, avatar: user.avatar,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/register (admin-only — guarded by authorize in routes)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, phone } = req.body;
    if (!name || !email || !password || !role) {
      throw new ValidationError("name, email, password, and role are required");
    }
    validatePassword(password);

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new ValidationError("Email already registered");

    const seq = await nextSequence("user");
    const userId = `ZRC-USR-${String(seq).padStart(5, "0")}`;
    const roleLevel = ROLE_LEVELS[role] ?? 4;

    const user = await User.create({
      userId, name, email: email.toLowerCase().trim(), password,
      phone: phone || "", role, roleLevel,
      departmentId: departmentId || null,
      createdBy: req.user?.id || null,
    });

    await logAudit({
      action: "user.create", entity: "User", entityId: user._id,
      userId: req.user?.id, userName: req.user?.name || "system",
      details: { newUserId: userId, role }, req,
    });

    success(res, { user: user.toJSON() }, 201);
  } catch (err) { next(err); }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new AuthenticationError("No refresh token");

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (e) {
      clearAuthCookies(res);
      if (e.name === "TokenExpiredError") throw new AuthenticationError("Refresh token expired");
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) { clearAuthCookies(res); throw new AuthenticationError("Invalid session"); }

    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      // Possible token reuse — invalidate all sessions
      user.tokenVersion += 1;
      await user.save();
      bustTokenCache(user._id.toString());
      clearAuthCookies(res);
      throw new AuthenticationError("Session invalidated — please log in again");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, newRefreshToken);

    success(res, { message: "Token refreshed" });
  } catch (err) { next(err); }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.tokenVersion += 1;
        await user.save();
        bustTokenCache(user._id.toString());
      }
    }
    clearAuthCookies(res);
    success(res, { message: "Logged out" });
  } catch (err) { next(err); }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("departmentId", "displayName slug");
    if (!user) throw new NotFoundError("User");
    success(res, {
      id: user._id, userId: user.userId, name: user.name, email: user.email,
      phone: user.phone, avatar: user.avatar, role: user.role, roleLevel: user.roleLevel,
      department: user.departmentId, permissions: req.user.permissions,
    });
  } catch (err) { next(err); }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError("Email is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond OK — don't reveal if email exists
    if (!user || !user.isActive) {
      return success(res, { message: "If this email exists, a reset link has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken   = crypto.createHmac("sha256", RESET_TOKEN_SECRET).update(rawToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_ORIGINS?.split(",")[0] || "http://localhost:5173"}/reset-password?token=${rawToken}&id=${user._id}`;

    try {
      const { escapeHtml } = require("../utils/sanitize");
      const nodemailer = require("nodemailer");
      const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_SECURE } = process.env;
      if (MAIL_HOST && MAIL_USER && MAIL_PASS) {
        const transporter = nodemailer.createTransport({
          host: MAIL_HOST, port: parseInt(MAIL_PORT) || 465,
          secure: MAIL_SECURE === "true",
          auth: { user: MAIL_USER, pass: MAIL_PASS },
        });
        await transporter.sendMail({
          from: `"ZRC Media Network" <${MAIL_USER}>`,
          to: user.email,
          subject: "Password Reset Request",
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#1a1a2e;">Password Reset</h2>
              <p>Dear ${escapeHtml(user.name)},</p>
              <p>Click the link below to reset your password. This link expires in 1 hour.</p>
              <p><a href="${resetUrl}" style="background:#3498db;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
              <p>If you did not request this, ignore this email.</p>
              <p style="color:#666;font-size:12px;">— ZRC Media Network</p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("⚠️ Password reset email failed:", emailErr.message);
    }

    success(res, { message: "If this email exists, a reset link has been sent" });
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, id, newPassword } = req.body;
    if (!token || !id || !newPassword) {
      throw new ValidationError("token, id, and newPassword are required");
    }
    validatePassword(newPassword);

    const hashedToken = crypto.createHmac("sha256", RESET_TOKEN_SECRET).update(token).digest("hex");

    const user = await User.findOne({
      _id: id,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) throw new ValidationError("Reset token is invalid or has expired");

    user.password             = newPassword;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion        += 1;
    bustTokenCache(user._id.toString());
    await user.save();

    clearAuthCookies(res);
    await logAudit({ action: "auth.password_reset", entity: "User", entityId: user._id, userId: user._id, req });

    success(res, { message: "Password reset successfully. Please log in." });
  } catch (err) { next(err); }
};

// POST /api/auth/revoke-all-sessions
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError("User");
    user.tokenVersion += 1;
    await user.save();
    bustTokenCache(user._id.toString());
    clearAuthCookies(res);
    await logAudit({ action: "auth.revoke_all_sessions", entity: "User", entityId: user._id, userId: user._id, req });
    success(res, { message: "All sessions revoked" });
  } catch (err) { next(err); }
};
```

- [ ] **Step 4: Update `server/models/User.js` — add reset token fields**

After the `lastLoginAt` field (line 31), add:
```js
  // Password reset
  passwordResetToken:   { type: String, default: null, select: false },
  passwordResetExpires: { type: Date,   default: null, select: false },
```

- [ ] **Step 5: Update `server/routes/auth.routes.js`**

Replace entirely:

```js
// routes/auth.routes.js
const router       = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const { loginLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/auth.controller");

router.post("/login",           loginLimiter, auth.login);
router.post("/register",        authenticate, authorize("users:create"), auth.register);
router.post("/refresh",         auth.refreshToken);
router.post("/logout",          authenticate, auth.logout);
router.get("/me",               authenticate, auth.getMe);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password",  auth.resetPassword);
router.post("/revoke-all-sessions", authenticate, auth.revokeAllSessions);

module.exports = router;
```

- [ ] **Step 6: Update `server/middleware/authenticate.js` — read from cookie OR header**

Replace the token extraction block (lines 42–49):

```js
const authenticate = async (req, _res, next) => {
  try {
    // Accept token from httpOnly cookie (preferred) or Authorization header (backward compat)
    let token = req.cookies?.accessToken;
    if (!token) {
      const header = req.headers.authorization;
      if (header?.startsWith("Bearer ")) {
        token = header.split(" ")[1].trim();
      }
    }
    if (!token) return next(new AuthenticationError("No token provided"));
    // ... rest of function unchanged from here ...
```

- [ ] **Step 7: Restart server and run tests**

```bash
cd server && node --test tests/auth.test.js
```

Expected: All 4 auth tests pass.

- [ ] **Step 8: Commit**

```bash
git add server/controllers/auth.controller.js server/models/User.js \
        server/routes/auth.routes.js server/middleware/authenticate.js \
        server/tests/auth.test.js
git commit -m "feat: migrate auth to httpOnly cookies, add logout/forgot-password/reset-password/revoke-sessions"
```

---

## Phase 3: Access Control Fixes

### Task 5: Add authorization guards to unprotected routes

**Files:**
- Modify: `server/routes/stats.routes.js`
- Modify: `server/controllers/stats.controller.js`
- Modify: `server/controllers/client.controller.js`
- Create: `server/tests/access.test.js`

- [ ] **Step 1: Write failing tests for access control**

Create `server/tests/access.test.js`:

```js
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

let clientCookies = [];
let adminCookies  = [];

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const clientLogin = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "client@zrc.com", password: "Client@123" });
  clientCookies = clientLogin.headers["set-cookie"] || [];

  const adminLogin = await supertest(app)
    .post("/api/auth/login")
    .send({ email: "admin@zrc.com", password: "Admin@123" });
  adminCookies = adminLogin.headers["set-cookie"] || [];
});

after(async () => { await mongoose.disconnect(); });

test("GET /api/stats/dashboard: client role is denied (403)", async () => {
  const res = await supertest(app)
    .get("/api/stats/dashboard")
    .set("Cookie", clientCookies);
  assert.equal(res.status, 403);
});

test("GET /api/stats/revenue: client role is denied (403)", async () => {
  const res = await supertest(app)
    .get("/api/stats/revenue")
    .set("Cookie", clientCookies);
  assert.equal(res.status, 403);
});

test("GET /api/stats/dashboard: admin role is allowed (200)", async () => {
  const res = await supertest(app)
    .get("/api/stats/dashboard")
    .set("Cookie", adminCookies);
  assert.equal(res.status, 200);
});

test("POST /api/auth/register: client role cannot register new users (403)", async () => {
  const res = await supertest(app)
    .post("/api/auth/register")
    .set("Cookie", clientCookies)
    .send({ name: "X", email: "x@x.com", password: "Test@123", role: "employee" });
  assert.equal(res.status, 403);
});
```

- [ ] **Step 2: Run tests — verify they fail (currently 200 instead of 403)**

```bash
cd server && node --test tests/access.test.js
```

Expected: `AssertionError: 200 == 403`

- [ ] **Step 3: Update `server/routes/stats.routes.js`**

Replace entirely:

```js
// routes/stats.routes.js
const router    = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const s = require("../controllers/stats.controller");

router.use(authenticate);

router.get("/dashboard",   authorize("reports:read:all", "reports:read:own", "finance:dashboard"), s.getDashboard);
router.get("/revenue",     authorize("finance:dashboard", "reports:read:all"),                     s.getRevenueChart);
router.get("/pl",          authorize("finance:dashboard"),                                          s.getProfitLoss);
router.get("/reports",     authorize("reports:read:all"),                                          s.getReports);
router.get("/clients/:id", authorize("clients:read:all", "clients:read:own"),                     s.getClientStats);

module.exports = router;
```

- [ ] **Step 4: Add ownership check in `getClientStats`**

In `server/controllers/stats.controller.js`, replace `exports.getClientStats`:

```js
exports.getClientStats = async (req, res, next) => {
  try {
    const clientId = req.params.id;
    const mongoose = require("mongoose");

    // Scope: account_manager can only see their own clients
    if (req.user.role === "account_manager") {
      const Client = require("../models/Client");
      const client = await Client.findById(clientId).select("accountManagerId").lean();
      if (!client || String(client.accountManagerId) !== String(req.user.id)) {
        return next(new (require("../utils/errors").ForbiddenError)("You can only view stats for your own clients"));
      }
    }

    const [invoiceAgg] = await Invoice.aggregate([
      { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
      { $group: {
        _id: null,
        totalBilled: { $sum: "$totalAmount" },
        totalCollected: { $sum: "$paidAmount" },
      }},
    ]);

    success(res, {
      totalBilled:       invoiceAgg?.totalBilled      || 0,
      totalCollected:    invoiceAgg?.totalCollected    || 0,
      totalOutstanding: (invoiceAgg?.totalBilled || 0) - (invoiceAgg?.totalCollected || 0),
    });
  } catch (err) { next(err); }
};
```

- [ ] **Step 5: Run the tests — verify they all pass**

```bash
cd server && node --test tests/access.test.js
```

Expected: All 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/routes/stats.routes.js server/controllers/stats.controller.js server/tests/access.test.js
git commit -m "security: add authorization guards to stats routes and client stats ownership check"
```

---

### Task 6: Fix controller-level ownership gaps

**Files:**
- Modify: `server/controllers/client.controller.js`
- Modify: `server/controllers/finance.controller.js`
- Modify: `server/routes/hr.routes.js`

- [ ] **Step 1: Add ownership check to `getClient` in `client.controller.js`**

In `exports.getClient` (after the `if (!client || client.isArchived)` check), add:

```js
    // Account managers can only view their own clients
    if (req.user.role === "account_manager" && String(client.accountManagerId?._id || client.accountManagerId) !== String(req.user.id)) {
      throw new NotFoundError("Client");
    }
```

- [ ] **Step 2: Add ownership check to `updateClient` in `client.controller.js`**

In `exports.updateClient`, after `if (!client || client.isArchived) throw new NotFoundError("Client");`, add:

```js
    if (req.user.role === "account_manager" && String(client.accountManagerId) !== String(req.user.id)) {
      throw new (require("../utils/errors").ForbiddenError)("You can only edit your own clients");
    }
```

- [ ] **Step 3: Add `accountManagerId` to allowed fields in `updateClient`**

In `exports.updateClient`, in the `allowed` array, add `"accountManagerId"` at the end — but only allow admins to change it. Replace the allowed-field loop with:

```js
    const allowed = [
      "companyName", "displayName", "contactName", "contactEmail", "contactPhone",
      "website", "industry", "region", "gstNumber", "panNumber", "billingAddress",
      "services", "contract", "priority", "healthScore", "tags", "notes",
      "lastContactedAt", "nextFollowUpAt", "logo",
    ];
    // Only admins can reassign account manager
    if (["super_admin", "admin"].includes(req.user.role)) {
      allowed.push("accountManagerId");
    }
    for (const key of allowed) {
      if (req.body[key] !== undefined) client[key] = req.body[key];
    }
```

- [ ] **Step 4: Fix `listPayments` scoping in `finance.controller.js`**

In `exports.listPayments`, add account_manager scoping after `const filter = {};`:

```js
    // Account managers see only payments for their clients
    if (req.user.role === "account_manager") {
      const clients = await Client.find({ accountManagerId: req.user.id }).select("_id").lean();
      filter.clientId = { $in: clients.map(c => c._id) };
    }
```

Make sure `Client` is imported at the top of `finance.controller.js` (it already is on line 4 — verify).

- [ ] **Step 5: Add payslip ownership check in `hr.routes.js`**

Replace the payslip route in `server/routes/hr.routes.js`:

```js
const { PERMISSIONS: P } = require("../config/roles");
const SalaryRecord = require("../models/SalaryRecord");
const { ForbiddenError, NotFoundError } = require("../utils/errors");

// Inline ownership middleware for payslip download
const ownPayslipOrAdmin = async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id).select("employeeId").lean();
    if (!record) return next(new NotFoundError("Salary Record"));
    const isOwn  = String(record.employeeId) === String(req.user.id);
    const isAdmin = req.user.permissions.includes(P.SALARY_READ);
    if (!isOwn && !isAdmin) return next(new ForbiddenError("You can only download your own payslip"));
    next();
  } catch (err) { next(err); }
};
```

And change the route line:
```js
router.get("/salaries/:id/payslip", ownPayslipOrAdmin, s.downloadPayslip);
```

- [ ] **Step 6: Add ownership check for invoice PDF in `finance.controller.js`**

In `exports.downloadInvoicePdf`, after `if (!invoice) throw new NotFoundError("Invoice");`, add:

```js
    // Clients can only download their own invoices
    if (req.user.role === "client" && String(invoice.clientId._id || invoice.clientId) !== String(req.user.linkedClientId)) {
      throw new (require("../utils/errors").ForbiddenError)("You can only download your own invoices");
    }
```

- [ ] **Step 7: Verify server starts without errors**

```bash
cd server && node -e "require('./app'); console.log('app ok')"
```

Expected: `app ok`

- [ ] **Step 8: Commit**

```bash
git add server/controllers/client.controller.js server/controllers/finance.controller.js server/routes/hr.routes.js
git commit -m "security: add ownership checks to client, payment, payslip, and invoice PDF endpoints"
```

---

## Phase 4: Bug Fixes

### Task 7: Fix milestone toggle field mismatch

**Files:**
- Modify: `server/controllers/project.controller.js`

- [ ] **Step 1: Fix `toggleMilestone` in `project.controller.js`**

Replace `exports.toggleMilestone`:

```js
exports.toggleMilestone = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new NotFoundError("Project");
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) throw new NotFoundError("Milestone");
    milestone.isCompleted = !milestone.isCompleted;
    milestone.completedAt = milestone.isCompleted ? new Date() : null;
    await project.save();
    success(res, project);
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Verify the field name matches the model**

```bash
cd server && node -e "
const s = require('./models/Project').schema;
const ms = s.path('milestones').schema;
console.log(Object.keys(ms.paths));
"
```

Expected output includes: `isCompleted`, `completedAt`

- [ ] **Step 3: Commit**

```bash
git add server/controllers/project.controller.js
git commit -m "fix: use correct field name isCompleted in toggleMilestone"
```

---

### Task 8: Fix salary PDF deductions sum bug

**Files:**
- Modify: `server/controllers/salary.controller.js`

- [ ] **Step 1: Fix the deductions rendering in `markSalaryPaid`**

In `salary.controller.js`, find the PDF rows section (around line 161–165) and replace:

```js
        const rows = [
          ["Base Salary", `₹${record.baseSalary.toLocaleString("en-IN")}`],
          ["Bonus", `₹${record.bonus.toLocaleString("en-IN")}`],
          ["Deductions", `- ₹${record.deductions.toLocaleString("en-IN")}`],
        ];
```

with:

```js
        const totalDeductions = (record.deductions || []).reduce((s, d) => s + (d.amount || 0), 0);
        const rows = [
          ["Base Salary", `Rs.${record.baseSalary.toLocaleString("en-IN")}`],
          ["Bonus",       `Rs.${record.bonus.toLocaleString("en-IN")}`],
          ["Deductions",  `- Rs.${totalDeductions.toLocaleString("en-IN")}`],
        ];
```

(Using `Rs.` instead of `₹` because PDFKit's default font doesn't support the rupee symbol — avoid garbled characters.)

Also update the Net Salary line below (around line 178):

```js
        doc.text(`Rs.${record.netSalary.toLocaleString("en-IN")}`, col2, netY + 5, { align: "right", width: 145 });
```

- [ ] **Step 2: Verify the fix doesn't break server load**

```bash
cd server && node -e "require('./controllers/salary.controller'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add server/controllers/salary.controller.js
git commit -m "fix: compute deductions sum before rendering salary PDF"
```

---

### Task 9: Add pagination max cap to all list controllers

**Files:**
- Modify: `server/controllers/client.controller.js`
- Modify: `server/controllers/project.controller.js`
- Modify: `server/controllers/task.controller.js`
- Modify: `server/controllers/content.controller.js`
- Modify: `server/controllers/finance.controller.js`
- Modify: `server/controllers/expense.controller.js`
- Modify: `server/controllers/salary.controller.js`
- Modify: `server/controllers/ticket.controller.js`
- Modify: `server/controllers/user.controller.js`

- [ ] **Step 1: In each `listX` controller, replace the limit line**

For every controller that does `parseInt(limit)`, change to:
```js
const safeLimit = Math.min(parseInt(limit) || 20, 200);
```
And replace all occurrences of `parseInt(limit)` in that controller's list function with `safeLimit`.

In `client.controller.js` `listClients`:
```js
const { page = 1, limit = 20, status, search, sort = "-createdAt" } = req.query;
const safeLimit = Math.min(parseInt(limit) || 20, 200);
const skip = (parseInt(page) - 1) * safeLimit;
// ...
.limit(safeLimit)
// ...
paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
```

Apply the same pattern to: `listProjects`, `listTasks`, `listContent`, `listInvoices`, `listPayments`, `listExpenses`, `listSalaryRecords`, `listTickets`, `listUsers`.

- [ ] **Step 2: Verify no syntax errors**

```bash
cd server && node -e "require('./app'); console.log('app ok')"
```

Expected: `app ok`

- [ ] **Step 3: Commit**

```bash
git add server/controllers/
git commit -m "security: cap pagination limit at 200 across all list endpoints"
```

---

## Phase 5: Frontend Auth Migration

### Task 10: Migrate frontend to cookie-based auth

**Files:**
- Modify: `client/src/lib/api.js`
- Modify: `client/src/lib/auth.jsx`
- Create: `client/.env`
- Create: `client/.env.production`

- [ ] **Step 1: Create env files**

Create `client/.env`:
```
VITE_API_URL=http://localhost:5001/api
```

Create `client/.env.production`:
```
VITE_API_URL=https://api.yourdomain.com/api
```

- [ ] **Step 2: Rewrite `client/src/lib/api.js`**

Replace entirely:

```js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

class ApiClient {
  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',  // send httpOnly cookies automatically
    })
    if (res.status === 401) {
      // Try to refresh the token silently
      const refreshed = await this._tryRefresh()
      if (refreshed) {
        const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' })
        const retryData = await retryRes.json()
        if (!retryRes.ok) { const err = new Error(retryData?.error?.message || 'Request failed'); err.status = retryRes.status; throw err }
        return retryData
      }
      // Refresh failed — redirect to login
      window.location.href = '/'
      throw new Error('Session expired')
    }
    const data = await res.json()
    if (!res.ok) { const err = new Error(data?.error?.message || 'Request failed'); err.status = res.status; throw err }
    return data
  }

  async _tryRefresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      return res.ok
    } catch { return false }
  }

  get(e)        { return this.request(e) }
  post(e, b)    { return this.request(e, { method: 'POST',   body: JSON.stringify(b) }) }
  patch(e, b)   { return this.request(e, { method: 'PATCH',  body: JSON.stringify(b) }) }
  del(e)        { return this.request(e, { method: 'DELETE' }) }

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }) }
  logout()               { return this.post('/auth/logout') }
  getMe()                { return this.get('/auth/me') }
  forgotPassword(email)  { return this.post('/auth/forgot-password', { email }) }
  resetPassword(d)       { return this.post('/auth/reset-password', d) }
  revokeAllSessions()    { return this.post('/auth/revoke-all-sessions') }

  // Clients
  getClients(q = '')             { return this.get(`/clients${q}`) }
  getClient(id)                  { return this.get(`/clients/${id}`) }
  createClient(d)                { return this.post('/clients', d) }
  updateClient(id, d)            { return this.patch(`/clients/${id}`, d) }
  changeClientStatus(id, d)      { return this.patch(`/clients/${id}/status`, d) }
  deleteClient(id)               { return this.del(`/clients/${id}`) }

  // Projects
  getProjects(q = '')            { return this.get(`/projects${q}`) }
  getProject(id)                 { return this.get(`/projects/${id}`) }
  createProject(d)               { return this.post('/projects', d) }
  updateProject(id, d)           { return this.patch(`/projects/${id}`, d) }
  changeProjectStatus(id, d)     { return this.patch(`/projects/${id}/status`, d) }
  addTeamMember(id, d)           { return this.post(`/projects/${id}/team`, d) }
  removeTeamMember(id, userId)   { return this.del(`/projects/${id}/team/${userId}`) }
  addMilestone(id, d)            { return this.post(`/projects/${id}/milestones`, d) }
  toggleMilestone(id, mId)       { return this.patch(`/projects/${id}/milestones/${mId}`, {}) }

  // Tasks
  getTasks(q = '')               { return this.get(`/tasks${q}`) }
  getTask(id)                    { return this.get(`/tasks/${id}`) }
  createTask(d)                  { return this.post('/tasks', d) }
  updateTask(id, d)              { return this.patch(`/tasks/${id}`, d) }
  changeTaskStatus(id, d)        { return this.patch(`/tasks/${id}/status`, d) }

  // Content
  getContent(q = '')             { return this.get(`/content${q}`) }
  getContentItem(id)             { return this.get(`/content/${id}`) }
  createContent(d)               { return this.post('/content', d) }
  updateContent(id, d)           { return this.patch(`/content/${id}`, d) }
  changeContentStatus(id, d)     { return this.patch(`/content/${id}/status`, d) }
  approveContent(id, d)          { return this.post(`/content/${id}/approve`, d) }
  rejectContent(id, d)           { return this.post(`/content/${id}/reject`, d) }

  // Finance
  getFinanceDashboard()          { return this.get('/finance/dashboard') }
  getInvoices(q = '')            { return this.get(`/finance/invoices${q}`) }
  createInvoice(d)               { return this.post('/finance/invoices', d) }
  sendInvoice(id)                { return this.post(`/finance/invoices/${id}/send`) }
  downloadInvoicePdf(id)         { return fetch(`${API_BASE}/finance/invoices/${id}/pdf`, { credentials: 'include' }) }
  getClientPayments()            { return this.get('/finance/client-payments') }
  logPayment(d)                  { return this.post('/finance/payments', d) }

  // HR / Salary
  getHrEmployees(q = '')         { return this.get(`/hr/employees${q}`) }
  updateEmployeeSalary(id, d)    { return this.patch(`/hr/employees/${id}/salary`, d) }
  createSalaryRecord(d)          { return this.post('/hr/salaries', d) }
  getSalaryRecords(q = '')       { return this.get(`/hr/salaries${q}`) }
  markSalaryPaid(id, d)          { return this.patch(`/hr/salaries/${id}/pay`, d) }
  updateDeductions(id, d)        { return this.patch(`/hr/salaries/${id}/deductions`, d) }
  getMySalaryRecords()           { return this.get('/hr/salaries/mine') }
  downloadPayslip(id)            { return fetch(`${API_BASE}/hr/salaries/${id}/payslip`, { credentials: 'include' }) }

  // Users
  getUsers(q = '')               { return this.get(`/users${q}`) }
  createUser(d)                  { return this.post('/users', d) }
  updateUser(id, d)              { return this.patch(`/users/${id}`, d) }
  deactivateUser(id)             { return this.post(`/users/${id}/deactivate`) }

  // Departments
  getDepartments()               { return this.get('/departments') }

  // Stats
  getDashboard()                 { return this.get('/stats/dashboard') }
  getRevenueChart(m = 6)         { return this.get(`/stats/revenue?months=${m}`) }
  getClientStats(id)             { return this.get(`/stats/clients/${id}`) }

  // Notifications
  getNotifications()             { return this.get('/notifications') }
  markAllRead()                  { return this.post('/notifications/mark-all-read') }

  // Expenses
  getExpenses(q = '')            { return this.get(`/expenses${q}`) }
  createExpense(d)               { return this.post('/expenses', d) }
  updateExpense(id, d)           { return this.patch(`/expenses/${id}`, d) }
  deleteExpense(id)              { return this.del(`/expenses/${id}`) }

  // P&L
  getPL(months = 6)              { return this.get(`/stats/pl?months=${months}`) }

  // Support Tickets
  getTickets(q = '')             { return this.get(`/tickets${q}`) }
  getTicket(id)                  { return this.get(`/tickets/${id}`) }
  createTicket(d)                { return this.post('/tickets', d) }
  updateTicketStatus(id, d)      { return this.patch(`/tickets/${id}/status`, d) }
  assignTicket(id, d)            { return this.patch(`/tickets/${id}/assign`, d) }
  addTicketReply(id, d)          { return this.post(`/tickets/${id}/reply`, d) }

  // Messages
  getChannels()                  { return this.get('/messages/channels') }
  getMessages(channelId, q = '') { return this.get(`/messages/${channelId}${q}`) }
  sendMessage(channelId, body)   { return this.post(`/messages/${channelId}`, { body }) }
  createDirectChannel(userId)    { return this.post('/messages/channels/direct', { userId }) }
}

export const api = new ApiClient()
export default api
```

- [ ] **Step 3: Rewrite `client/src/lib/auth.jsx`**

Replace entirely:

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMe()
      .then(res => { setUser(res.data); setLoading(false) })
      .catch(() => { setUser(null); setLoading(false) })
  }, [])

  const login = async (email, password) => {
    const res = await api.login(email, password)
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
```

- [ ] **Step 4: Start both server and client and verify login still works**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open `http://localhost:5173`, log in as admin. Verify:
- Login succeeds and you reach the dashboard
- Refreshing the page keeps you logged in (cookie persists)
- Opening DevTools → Application → Cookies → localhost: see `accessToken` and `refreshToken` with HttpOnly flag
- DevTools → Application → Local Storage: NO token stored there

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api.js client/src/lib/auth.jsx client/.env client/.env.production
git commit -m "feat: migrate frontend to httpOnly cookie auth, remove localStorage token storage"
```

---

### Task 11: Fix frontend route guards

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Fix role gate constants**

In `client/src/App.jsx`, replace lines 54–58:

```jsx
  const r = user?.role
  const isAdmin    = ['super_admin', 'admin'].includes(r)
  const isManager  = ['super_admin', 'admin', 'account_manager', 'project_manager'].includes(r)
  const isFinance  = ['super_admin', 'admin'].includes(r)
  const isReporter = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(r)
  const canTickets = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(r)
```

- [ ] **Step 2: Fix the Tickets route — replace `isAdmin` with `canTickets`**

In the route list, change:
```jsx
        {isAdmin    && <Route path="tickets" element={<TicketsPage />} />}
        {isAdmin    && <Route path="settings" element={<SettingsPage />} />}
```
to:
```jsx
        {canTickets && <Route path="tickets" element={<TicketsPage />} />}
        {isAdmin    && <Route path="settings" element={<SettingsPage />} />}
```

- [ ] **Step 3: Add ForgotPassword and ResetPassword routes**

At the top of `App.jsx`, add imports:
```jsx
import ForgotPasswordPage from '@/pages/ForgotPassword'
import ResetPasswordPage  from '@/pages/ResetPassword'
```

Before `function ProtectedRoutes()`, add a public routes section. Wrap the entire App return in a `BrowserRouter` that checks if the path is `/forgot-password` or `/reset-password` before entering `ProtectedRoutes`.

The simplest approach — add these as unprotected routes at the top level:

```jsx
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
            <Route path="*"                element={<ProtectedRoutes />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

Remove the `<BrowserRouter>` wrapper from inside `ProtectedRoutes` (the inner `<Routes>` stays).

- [ ] **Step 4: Verify the app still loads**

```bash
cd client && npm run dev
```

Navigate to `http://localhost:5173`. Verify dashboard loads for admin, portal loads for client role.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "fix: correct frontend route guards to match permission model, add public auth routes"
```

---

## Phase 6: Password Reset Frontend

### Task 12: ForgotPassword and ResetPassword pages

**Files:**
- Create: `client/src/pages/ForgotPassword.jsx`
- Create: `client/src/pages/ResetPassword.jsx`
- Modify: `client/src/pages/Login.jsx`

- [ ] **Step 1: Create `ForgotPassword.jsx`**

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(email.trim())
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Forgot Password</h1>
        {submitted ? (
          <div>
            <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
              If that email is registered, a reset link has been sent. Check your inbox.
            </p>
            <Link to="/" className="text-sm" style={{ color: 'var(--color-accent)' }}>← Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Enter your email and we'll send you a reset link.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2 rounded-lg font-semibold text-sm"
              style={{ background: 'var(--color-accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <p className="text-sm text-center mt-2">
              <Link to="/" style={{ color: 'var(--color-accent)' }}>← Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `ResetPassword.jsx`**

```jsx
import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '@/lib/api'

export default function ResetPasswordPage() {
  const [params]          = useSearchParams()
  const navigate          = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const token = params.get('token')
  const id    = params.get('id')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await api.resetPassword({ token, id, newPassword: password })
      navigate('/?reset=1')
    } catch (err) {
      setError(err.message || 'Reset failed — link may have expired')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !id) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-text-muted)' }}>Invalid reset link.</p>
          <Link to="/forgot-password" style={{ color: 'var(--color-accent)' }}>Request a new one →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>New Password</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder="Min 8 chars, include a number or symbol"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Confirm Password</label>
            <input
              type="password" required value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder="Repeat new password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 rounded-lg font-semibold text-sm"
            style={{ background: 'var(--color-accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add "Forgot password?" link to `Login.jsx`**

Find the submit button in `Login.jsx` and add below it:

```jsx
<p className="text-sm text-center mt-3">
  <Link to="/forgot-password" style={{ color: 'var(--color-text-muted)' }}>Forgot password?</Link>
</p>
```

Make sure `Link` is imported: `import { Link } from 'react-router-dom'`

- [ ] **Step 4: Verify pages render**

```bash
cd client && npm run dev
```

Navigate to `http://localhost:5173/forgot-password` — verify the form renders without errors.
Navigate to `http://localhost:5173/reset-password` — verify the "Invalid reset link" state renders.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ForgotPassword.jsx client/src/pages/ResetPassword.jsx client/src/pages/Login.jsx
git commit -m "feat: add forgot password and reset password pages"
```

---

## Phase 7: Session Management

### Task 13: Session management Security tab in Settings

**Files:**
- Modify: `client/src/pages/Settings.jsx`

- [ ] **Step 1: Read the current Settings.jsx to understand its tab structure**

Read `client/src/pages/Settings.jsx` before editing to find the existing tab implementation pattern.

- [ ] **Step 2: Add a Security tab to Settings**

Add a "Security" tab section to the Settings page. Find where other tabs are rendered and add:

```jsx
// Inside Settings component, add state for active tab if not already present
const [activeTab, setActiveTab] = useState('general') // or whatever the existing default is
const [revoking, setRevoking] = useState(false)
const { logout } = useAuth()

const handleRevokeAll = async () => {
  if (!window.confirm('This will sign you out of all devices. Continue?')) return
  setRevoking(true)
  try {
    await api.revokeAllSessions()
    logout()
  } catch (err) {
    console.error('Revoke failed:', err.message)
  } finally {
    setRevoking(false)
  }
}
```

Add the Security tab button alongside the other tab buttons:
```jsx
<button
  onClick={() => setActiveTab('security')}
  className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === 'security' ? 'bg-accent text-white' : ''}`}
  style={activeTab !== 'security' ? { color: 'var(--color-text-muted)' } : {}}
>
  Security
</button>
```

Add the Security tab panel content:
```jsx
{activeTab === 'security' && (
  <div className="space-y-6">
    <div className="p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Active Sessions</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Sign out of all devices. This will log out your current session and any others.
      </p>
      <button
        onClick={handleRevokeAll}
        disabled={revoking}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#ef4444', color: '#fff', opacity: revoking ? 0.7 : 1 }}
      >
        {revoking ? 'Signing out…' : 'Sign Out of All Devices'}
      </button>
    </div>
  </div>
)}
```

Make sure `useAuth` is imported: `import { useAuth } from '@/lib/auth'`

- [ ] **Step 3: Verify Settings page renders and the Security tab is visible**

```bash
cd client && npm run dev
```

Log in as admin, navigate to `/settings`, click "Security" tab, verify the button appears.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Settings.jsx
git commit -m "feat: add Security tab to Settings with revoke-all-sessions"
```

---

## Phase 8: Real-time Messaging

### Task 14: Messaging models and backend

**Files:**
- Create: `server/models/Channel.js`
- Create: `server/models/Message.js`
- Create: `server/controllers/message.controller.js`
- Create: `server/routes/message.routes.js`
- Modify: `server/app.js`
- Modify: `server/server.js`

- [ ] **Step 1: Create `server/models/Channel.js`**

```js
// models/Channel.js
const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  type:         { type: String, enum: ["direct", "project"], required: true },
  name:         { type: String, default: "" },                         // used for project channels
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  lastMessage:  { type: String, default: "" },
  lastAt:       { type: Date, default: null },
}, { timestamps: true });

channelSchema.index({ participants: 1 });
channelSchema.index({ projectId: 1 });
channelSchema.index({ type: 1 });

module.exports = mongoose.model("Channel", channelSchema);
```

- [ ] **Step 2: Create `server/models/Message.js`**

```js
// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body:      { type: String, required: true, trim: true, maxlength: 5000 },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

messageSchema.index({ channelId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
```

- [ ] **Step 3: Create `server/controllers/message.controller.js`**

```js
// controllers/message.controller.js
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { escapeHtml } = require("../utils/sanitize");

// GET /api/messages/channels — list channels the user participates in
exports.listChannels = async (req, res, next) => {
  try {
    const channels = await Channel.find({ participants: req.user.id })
      .populate("participants", "name avatar role")
      .populate("projectId", "name")
      .sort("-lastAt -updatedAt")
      .lean();
    success(res, channels);
  } catch (err) { next(err); }
};

// POST /api/messages/channels/direct — get or create a DM channel
exports.getOrCreateDirect = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new ValidationError("userId is required");
    if (String(userId) === String(req.user.id)) throw new ValidationError("Cannot message yourself");

    let channel = await Channel.findOne({
      type: "direct",
      participants: { $all: [req.user.id, userId], $size: 2 },
    });

    if (!channel) {
      channel = await Channel.create({ type: "direct", participants: [req.user.id, userId] });
    }

    await channel.populate("participants", "name avatar role");
    success(res, channel);
  } catch (err) { next(err); }
};

// GET /api/messages/:channelId — get paginated messages for a channel
exports.getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 100);

    const channel = await Channel.findById(req.params.channelId).lean();
    if (!channel) throw new NotFoundError("Channel");

    const isMember = channel.participants.some(p => String(p) === String(req.user.id));
    if (!isMember) throw new ForbiddenError("You are not a member of this channel");

    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      Message.find({ channelId: req.params.channelId })
        .populate("senderId", "name avatar role")
        .sort("-createdAt")
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Message.countDocuments({ channelId: req.params.channelId }),
    ]);

    paginated(res, { docs: docs.reverse(), total, page: parseInt(page), limit: safeLimit });
  } catch (err) { next(err); }
};

// POST /api/messages/:channelId — send a message (also emits via Socket.io)
exports.sendMessage = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) throw new ValidationError("message body is required");

    const channel = await Channel.findById(req.params.channelId);
    if (!channel) throw new NotFoundError("Channel");

    const isMember = channel.participants.some(p => String(p) === String(req.user.id));
    if (!isMember) throw new ForbiddenError("You are not a member of this channel");

    const message = await Message.create({
      channelId: channel._id,
      senderId:  req.user.id,
      body:      body.trim(),
    });

    channel.lastMessage = body.trim().slice(0, 100);
    channel.lastAt      = new Date();
    await channel.save();

    await message.populate("senderId", "name avatar role");

    // Emit to channel room via Socket.io (io attached to req.app in server.js)
    const io = req.app.get("io");
    if (io) {
      io.to(`channel:${channel._id}`).emit("message:receive", {
        channelId: String(channel._id),
        message,
      });
    }

    created(res, message);
  } catch (err) { next(err); }
};
```

- [ ] **Step 4: Create `server/routes/message.routes.js`**

```js
// routes/message.routes.js
const router       = require("express").Router();
const authenticate = require("../middleware/authenticate");
const m = require("../controllers/message.controller");

router.use(authenticate);

router.get("/channels",                m.listChannels);
router.post("/channels/direct",        m.getOrCreateDirect);
router.get("/:channelId",              m.getMessages);
router.post("/:channelId",             m.sendMessage);

module.exports = router;
```

- [ ] **Step 5: Register message routes in `server/app.js`**

After the ticket routes line (line 93), add:
```js
const messageRoutes = require("./routes/message.routes");
// ...
app.use("/api/messages", messageRoutes);
```

- [ ] **Step 6: Add Socket.io to `server/server.js`**

Read `server/server.js` first, then add Socket.io. The typical pattern:

```js
const http      = require("http");
const { Server } = require("socket.io");
const app       = require("./app");
const { PORT, FRONTEND_ORIGINS } = require("./config/env");

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGINS, credentials: true },
});

// Expose io to controllers via app
app.set("io", io);

io.on("connection", (socket) => {
  const channelId = socket.handshake.query.channelId;
  if (channelId) socket.join(`channel:${channelId}`);

  socket.on("message:join", (chId) => { socket.join(`channel:${chId}`); });
  socket.on("message:leave", (chId) => { socket.leave(`channel:${chId}`); });

  socket.on("message:typing", ({ channelId: chId }) => {
    socket.to(`channel:${chId}`).emit("message:typing", { userId: socket.handshake.query.userId });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

Install socket.io on the server:
```bash
cd server && npm install socket.io
```

- [ ] **Step 7: Verify server starts**

```bash
cd server && npm run dev
```

Expected: `🚀 Server running on port 5001` with no errors.

- [ ] **Step 8: Commit**

```bash
git add server/models/Channel.js server/models/Message.js \
        server/controllers/message.controller.js server/routes/message.routes.js \
        server/app.js server/server.js server/package.json server/package-lock.json
git commit -m "feat: add real-time messaging backend with Socket.io, Channel and Message models"
```

---

### Task 15: Frontend Messages page

**Files:**
- Modify: `client/src/pages/Messages.jsx`

- [ ] **Step 1: Replace the stub `Messages.jsx` with a functional chat UI**

Replace `client/src/pages/Messages.jsx` entirely:

```jsx
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')

export default function MessagesPage() {
  const { user }              = useAuth()
  const [channels, setChannels]   = useState([])
  const [activeChannel, setActive] = useState(null)
  const [messages, setMessages]   = useState([])
  const [body, setBody]           = useState('')
  const [loading, setLoading]     = useState(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  // Load channels on mount
  useEffect(() => {
    api.getChannels().then(r => setChannels(r.data || [])).catch(() => {})
  }, [])

  // Connect Socket.io when active channel changes
  useEffect(() => {
    if (!activeChannel) return

    setLoading(true)
    api.getMessages(activeChannel._id).then(r => {
      setMessages(r.data?.docs || [])
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    }).catch(() => setLoading(false))

    if (socketRef.current) {
      socketRef.current.emit('message:leave', activeChannel._id)
    } else {
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        query: { userId: user?.id },
      })
      socketRef.current.on('message:receive', ({ channelId, message }) => {
        if (channelId === activeChannel._id) {
          setMessages(prev => [...prev, message])
          setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
        }
        setChannels(prev => prev.map(c => c._id === channelId ? { ...c, lastMessage: message.body } : c))
      })
    }
    socketRef.current.emit('message:join', activeChannel._id)

    return () => {
      socketRef.current?.emit('message:leave', activeChannel._id)
    }
  }, [activeChannel?._id])

  useEffect(() => {
    return () => { socketRef.current?.disconnect() }
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!body.trim() || !activeChannel) return
    const text = body.trim()
    setBody('')
    try {
      await api.sendMessage(activeChannel._id, text)
    } catch (err) {
      setBody(text)
    }
  }

  const getChannelName = (ch) => {
    if (ch.type === 'project') return ch.projectId?.name || ch.name || 'Project Channel'
    const other = (ch.participants || []).find(p => p._id !== user?.id)
    return other?.name || 'Direct Message'
  }

  return (
    <div className="flex h-[calc(100vh-64px)]" style={{ background: 'var(--color-bg)' }}>
      {/* Channel list */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="p-4 border-b font-semibold text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          Messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {channels.length === 0 && (
            <p className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No conversations yet.</p>
          )}
          {channels.map(ch => (
            <button
              key={ch._id}
              onClick={() => setActive(ch)}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{
                background: activeChannel?._id === ch._id ? 'var(--color-accent-subtle, rgba(59,130,246,0.1))' : 'transparent',
                color: 'var(--color-text)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div className="font-medium truncate">{getChannelName(ch)}</div>
              {ch.lastMessage && (
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ch.lastMessage}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col">
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Select a conversation to start messaging.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}>
              {getChannelName(activeChannel)}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loading && <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
              {messages.map(msg => {
                const isOwn = String(msg.senderId?._id || msg.senderId) === String(user?.id)
                return (
                  <div key={msg._id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}>
                        {msg.senderId?.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      {!isOwn && <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{msg.senderId?.name}</p>}
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-xs"
                        style={{
                          background: isOwn ? 'var(--color-accent)' : 'var(--color-surface)',
                          color: isOwn ? '#fff' : 'var(--color-text)',
                          border: isOwn ? 'none' : '1px solid var(--color-border)',
                        }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="px-6 py-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
              <input
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="submit" disabled={!body.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff', opacity: body.trim() ? 1 : 0.5 }}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

```bash
cd client && npm run dev
```

Navigate to `/messages` as an admin user. Verify the channel list and message thread panels render without errors. (Channels will be empty until DM channels are created.)

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Messages.jsx
git commit -m "feat: implement real-time messaging frontend with Socket.io channel support"
```

---

## Final Verification

### Task 16: End-to-end smoke test

- [ ] **Step 1: Run the server test suite**

```bash
cd server && node --test tests/sanitize.test.js && node --test tests/auth.test.js && node --test tests/access.test.js
```

Expected: All tests pass.

- [ ] **Step 2: Manual verification checklist**

With both server and client running (`npm run dev` in each):

| Check | Expected |
|-------|---------|
| Log in as admin | Success; no token in localStorage |
| Refresh browser | Still logged in (cookie persists) |
| Log out (top bar) | Redirected to login; cookie cleared |
| Go to `/forgot-password` | Form renders |
| Go to `/settings` → Security | "Sign Out of All Devices" button visible |
| Log in as `client` role | Redirected to portal |
| As `client`, hit `/api/stats/dashboard` in DevTools Network | `403 Forbidden` |
| Toggle a milestone in ProjectDetail | Milestone visually toggles and persists on refresh |
| As admin, try `?limit=99999` on any list | Returns max 200 records |

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass — all security fixes and features complete"
```

---

## Spec Coverage Check

| Spec Section | Task |
|---|---|
| httpOnly cookie auth | Task 4 |
| Refresh token rotation | Task 4 (refreshToken controller) |
| Server-side logout | Task 4 (logout endpoint) |
| Password policy | Task 4 (validatePassword in auth.controller) |
| `/auth/register` role guard | Task 4 (routes) |
| Stats dashboard/revenue authorization | Task 5 |
| Client stats ownership | Task 5 |
| listPayments scoping | Task 6 |
| getClient/updateClient ownership | Task 6 |
| Payslip download ownership | Task 6 |
| Invoice PDF ownership | Task 6 |
| accountManagerId in updateClient | Task 6 |
| Email HTML injection fix | Task 2 |
| Milestone field mismatch | Task 7 |
| Salary PDF deductions | Task 8 |
| Frontend route guards | Task 11 |
| Pagination max cap | Task 9 |
| Hardcoded API URL | Task 10 |
| localStorage → cookies (frontend) | Task 10 |
| Password reset (backend) | Task 4 |
| Password reset (frontend) | Task 12 |
| Session management (revoke all) | Task 4 + Task 13 |
| Real-time messaging (backend) | Task 14 |
| Real-time messaging (frontend) | Task 15 |
| Account manager reassignment | Task 6 |
| SMTP TLS warning | Task 3 |
| RESET_TOKEN_SECRET | Task 3 |
