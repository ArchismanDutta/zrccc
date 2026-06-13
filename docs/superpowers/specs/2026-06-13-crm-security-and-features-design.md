# ZRC CRM — Security Hardening + Full Feature Phase
**Date:** 2026-06-13  
**Status:** Approved  
**Scope:** Security fixes, access control corrections, bug fixes, and missing features  

---

## 1. Context

A full audit of the ZRC CRM codebase revealed critical security vulnerabilities, access control gaps, logic bugs, and missing features. This document defines the complete fix and feature set for the next implementation phase.

---

## 2. Security Issues to Fix

### 2.1 JWT Token Storage (Critical)
**Problem:** Access and refresh tokens are stored in `localStorage` (`client/src/lib/api.js:4`). Any XSS attack on the frontend steals them permanently.  
**Fix:** Migrate to `httpOnly; Secure; SameSite=Strict` cookies. The server sets tokens via `Set-Cookie`; the frontend never touches token strings.  
**Scope:** Server auth controller + cookie config; frontend removes all `localStorage.getItem/setItem` token calls; Axios/fetch sends `credentials: 'include'`.

### 2.2 Hardcoded API URL (High)
**Problem:** `const API_BASE = 'http://localhost:5001/api'` breaks in every non-local environment.  
**Fix:** Use `import.meta.env.VITE_API_URL` with a fallback. Add `VITE_API_URL` to `.env` files.

### 2.3 HTML Injection in Email (High)
**Problem:** `sendTicketReplyEmail` (`mailer.js:201`) inserts `reply.message` directly into HTML. An attacker can inject HTML/scripts into emails sent to clients.  
**Fix:** Escape HTML entities in all user-supplied strings before inserting into email HTML. Use a helper: `escapeHtml(str)` that replaces `&`, `<`, `>`, `"`, `'`.

### 2.4 SMTP TLS Not Enforced
**Problem:** `MAIL_SECURE` defaults to `false` (plain-text SMTP).  
**Fix:** Default `MAIL_SECURE=true` in production. Add `MAIL_SECURE` to `env.js` with production validation.

---

## 3. Access Control Fixes

### 3.1 Unprotected Routes

| Route | Problem | Fix |
|-------|---------|-----|
| `POST /auth/register` | No role guard — any authenticated user (incl. `client`) can create users | Add `authorize("users:create")` |
| `GET /stats/dashboard` | No authorize — clients see company MRR + all stats | Add `authorize("reports:read:all", "reports:read:own")` |
| `GET /stats/revenue` | Clients see revenue charts | Add `authorize("finance:dashboard", "reports:read:all")` |
| `GET /stats/clients/:id` | No ownership check | Verify caller is account manager for that client OR has `clients:read:all` |
| `GET /hr/salaries/:id/payslip` | Any user downloads any payslip | Verify `record.employeeId === req.user.id` OR has `hr:salaries:read` |
| `GET /finance/invoices/:id/pdf` | No `own`-scope check in controller | Verify `invoice.clientId` matches `req.user.linkedClientId` for client role |

### 3.2 Missing Scoping in Controllers

- **`listPayments`** (`finance.controller.js:166`): Add account_manager scoping — query only payments for clients where `accountManagerId === req.user.id`.
- **`getClient`** (`client.controller.js:89`): Add ownership check for `account_manager` role — verify `client.accountManagerId === req.user.id`.
- **`updateClient`** (`client.controller.js:104`): Same ownership check before allowing update.
- **`downloadPayslip`** (`salary.controller.js:224`): Add ownership + permission check.

### 3.3 Missing `accountManagerId` in updateClient
**Problem:** `accountManagerId` is not in the `allowed` fields list in `updateClient`, so reassigning clients to different account managers is impossible.  
**Fix:** Add `accountManagerId` to the `allowed` array (admin-only update).

---

## 4. Bug Fixes

### 4.1 Milestone Toggle Field Mismatch (Bug)
**Location:** `server/controllers/project.controller.js:188–189` vs `server/models/Project.js:15`  
**Problem:** Model defines `isCompleted` but controller sets `milestone.completed`. Toggle silently does nothing.  
**Fix:** Change controller to `milestone.isCompleted = !milestone.isCompleted` and `milestone.completedAt = milestone.isCompleted ? new Date() : null`.

### 4.2 Salary PDF Deductions Bug (Bug)
**Location:** `server/controllers/salary.controller.js:164`  
**Problem:** `record.deductions.toLocaleString("en-IN")` is called on an array of objects, rendering `[object Object]` in the payslip PDF.  
**Fix:** Compute `const totalDeductions = record.deductions.reduce((s, d) => s + (d.amount || 0), 0)` and use that value.

### 4.3 Frontend Route Gates Don't Match Permissions (Bug)
**Location:** `client/src/App.jsx:57–58`  
**Problem:**
- `isFinance = r === 'super_admin'` — `admin` cannot access Finance despite having `finance:dashboard` permission
- Tickets gated by `isAdmin` — `project_manager` and `account_manager` have ticket permissions
- Reports gated by `isReporter = ['super_admin','admin']` — `project_manager` has `reports:read:own`

**Fix:**
```js
const isFinance  = ['super_admin', 'admin'].includes(r)
const isReporter = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(r)
const canTickets = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(r)
```
Replace `isAdmin` with `canTickets` for the Tickets route.

### 4.4 Pagination Max Cap (Bug)
**Problem:** `?limit=99999` is accepted in all list endpoints, potentially dumping entire collections.  
**Fix:** In every paginated controller, cap the limit: `const safeLimit = Math.min(parseInt(limit) || 20, 200)`. Apply to all `listX` controllers.

---

## 5. Authentication Architecture Changes

### 5.1 httpOnly Cookie Auth
- **Server:** `auth.controller.js` — on login and refresh, set tokens via `res.cookie('accessToken', ..., { httpOnly: true, secure: IS_PRODUCTION, sameSite: 'strict', maxAge: ... })`.
- **Authenticate middleware:** Read token from `req.cookies.accessToken` (in addition to `Authorization` header for API backward-compat during transition).
- **Frontend:** Remove all `localStorage` token handling. Switch `fetch` to `credentials: 'include'`. Remove `Authorization` header from requests — cookies are sent automatically.

### 5.2 Refresh Token Rotation
- On `POST /auth/refresh`: verify old refresh token cookie → issue new access token cookie + new refresh token cookie → invalidate old refresh token (store last-used hash or use tokenVersion bump).
- If a rotated refresh token is reused: bump tokenVersion (invalidate all sessions).

### 5.3 Server-Side Logout
- New route: `POST /api/auth/logout`
- Action: clear both cookies (`res.clearCookie`), bump `tokenVersion`, bust token cache.
- No auth required — works even if access token is expired.

### 5.4 Password Policy
- Minimum 8 characters, at least 1 number OR special character.
- Enforced in: `auth.controller.js register`, `user.controller.js createUser`, and password reset.
- Error: `"Password must be at least 8 characters and contain at least one number or special character"`.

---

## 6. New Features

### 6.1 Password Reset Flow

**Backend:**
- Add `passwordResetToken: String` and `passwordResetExpires: Date` fields to `User` model.
- `POST /api/auth/forgot-password`: Accepts `{ email }`. Generates a crypto-random token, stores `bcrypt.hash(token)` on user with 1hr expiry, emails the link.
- `POST /api/auth/reset-password`: Accepts `{ token, newPassword }`. Finds user by hashed token, checks expiry, sets new password, clears reset fields, bumps tokenVersion.

**Frontend:**
- Login page: "Forgot password?" link → `/forgot-password` page (email input + submit).
- New page `/reset-password?token=...` — password + confirm password form.
- Success state shows "Password reset. You can now log in."

### 6.2 Session Management (Settings Page)
- Add `sessions: [{ ip, userAgent, createdAt }]` metadata to User (optional, for display only).
- `POST /api/auth/revoke-all-sessions`: bumps tokenVersion, invalidates all active sessions.
- **Frontend Settings page** (new tab "Security"): shows current session info (IP, browser) + "Sign out of all devices" button.

### 6.3 Real-Time Messaging (WebSocket)

**Data Model:**
```
Message: { _id, channelId, senderId, body, createdAt, readBy: [userId] }
Channel: { _id, type: 'direct'|'project', participants: [userId], projectId?, name?, lastMessage, lastAt }
```

**Backend routes:**
- `GET /api/messages/channels` — list channels for the authenticated user
- `GET /api/messages/:channelId` — paginated message history (newest first)
- `POST /api/messages/:channelId` — send a message (also triggers Socket.io emit)

**Socket.io events:**
- `message:send` (client → server): `{ channelId, body }`
- `message:receive` (server → client): `{ channelId, message }`
- `message:typing` (client → server), `message:typing` (server → others in channel)

**Frontend:**
- Replace stub `Messages.jsx` with a split-panel UI: channel list (left) + message thread (right).
- Direct messages + per-project channels.
- Unread badge on sidebar nav icon.

### 6.4 Account Manager Client Reassignment
- Add `accountManagerId` to allowed fields in `updateClient` (admin-only).
- Frontend `ClientDetail` page: "Reassign Account Manager" button (admin only) → user picker modal.

---

## 7. Env Variable Changes

New env vars required:

```
# Frontend (.env)
VITE_API_URL=http://localhost:5001/api

# Server (.env)
MAIL_SECURE=true                    # enforce TLS for SMTP
RESET_TOKEN_SECRET=<random-secret>  # for signing password reset tokens
COOKIE_SECRET=<random-secret>       # for cookie signing (optional)
```

`env.js` validation: add `RESET_TOKEN_SECRET` to required list in production.

---

## 8. What Is Explicitly Out of Scope

- 2FA / MFA (next phase)
- Email verification on account creation (next phase)
- Audit log viewer UI (next phase)
- Meta ads campaign tracking (future PRD module)
- File upload system for avatars/logos (next phase)

---

## 9. File Change Summary

**Server:**
- `config/env.js` — add RESET_TOKEN_SECRET, validate MAIL_SECURE in prod
- `models/User.js` — add passwordResetToken, passwordResetExpires fields
- `models/Message.js` — new model
- `models/Channel.js` — new model
- `controllers/auth.controller.js` — httpOnly cookies, rotation, logout, forgot/reset password
- `middleware/authenticate.js` — read from cookie + header
- `controllers/project.controller.js` — fix milestone isCompleted
- `controllers/salary.controller.js` — fix deductions sum in PDF
- `controllers/finance.controller.js` — listPayments scoping, invoice PDF ownership
- `controllers/client.controller.js` — getClient/updateClient ownership check, add accountManagerId
- `controllers/stats.controller.js` — client stats ownership check
- `controllers/message.controller.js` — new
- `routes/auth.routes.js` — add logout, forgot-password, reset-password; add authorize to register
- `routes/stats.routes.js` — add authorize guards
- `routes/hr.routes.js` — add ownership check to payslip route
- `routes/message.routes.js` — new
- `server.js` — add Socket.io, cookie-parser already present
- `utils/mailer.js` — add escapeHtml helper, apply to all user-supplied content

**Frontend:**
- `lib/api.js` — use VITE_API_URL, remove localStorage token handling, add credentials: include
- `lib/auth.jsx` — remove localStorage token, adapt to cookie-based auth
- `App.jsx` — fix isFinance, isReporter, canTickets route guards
- `pages/Login.jsx` — add "Forgot password?" link
- `pages/ForgotPassword.jsx` — new
- `pages/ResetPassword.jsx` — new
- `pages/Messages.jsx` — real implementation (replace stub)
- `pages/Settings.jsx` — add Security tab with session management
- All paginated controllers — enforce limit cap
