# ZRC Media Network CRM — Phase 2 Design Spec

**Date:** 2026-06-02  
**Project:** zrcnewcrm  
**Status:** Approved

---

## Overview

Extend the existing ZRC Media Network CRM (React 19 + Vite + Tailwind frontend, Express + MongoDB backend) with deep finance, client/project detail views, a client-facing portal, HR/payroll management, real analytics, email notifications, and a support ticket system.

---

## 1. Architecture

### 1.1 Single App, Role-Based UI Split

One React app handles both internal CRM users and external clients.

- `App.jsx` checks `user.role`
- `role === 'client'` → renders `<ClientPortalLayout>` + portal routes (`/portal/*`)
- All other roles → existing `<AppLayout>` + internal routes

Same backend, same JWT auth endpoint (`POST /api/auth/login`), same token format.

### 1.2 PDF Generation

Server-side using `pdfkit`. Payslips generated on demand or when salary is marked paid. PDF saved to `uploads/payslips/<salaryId>.pdf`. URL stored in `SalaryRecord.payslipUrl`. Download via `GET /api/hr/salaries/:id/payslip`.

### 1.3 Email

Nodemailer with cPanel SMTP (`contact@zrcmedianetwork.com`). Config via `.env`:

```
MAIL_HOST=mail.zrcmedianetwork.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=contact@zrcmedianetwork.com
MAIL_PASS=<password>
MAIL_FROM="ZRC Media Network <contact@zrcmedianetwork.com>"
```

Central `utils/mailer.js` exports named functions per trigger. HTML templates are inline strings — no templating engine.

### 1.4 Social Media Metrics

Manual input per client per platform. Each update appended to a `socialMetrics` history array on the `Client` document. Frontend plots a growth line chart from this history.

---

## 2. New Data Models

### 2.1 Expense

```js
{
  expenseId: String,       // ZRC-EXP-00001 (auto-seq)
  category: enum [
    'rent', 'utilities', 'software_tools', 'freelancer',
    'equipment', 'office_supplies', 'marketing', 'travel', 'misc'
  ],
  description: String,     // required
  amount: Number,          // required, min 0
  currency: 'INR',
  date: Date,              // required
  vendor: String,
  recurring: Boolean,
  paidBy: ObjectId→User,
  createdBy: ObjectId→User,
  notes: String
}
```

### 2.2 SalaryRecord

```js
{
  salaryId: String,        // ZRC-SAL-00001 (auto-seq)
  employeeId: ObjectId→User,  // required
  month: Number,           // 1–12
  year: Number,
  baseSalary: Number,      // required
  bonus: Number,           // default 0
  deductions: Number,      // default 0
  netSalary: Number,       // auto-calc: base + bonus - deductions (pre-save hook)
  status: enum ['pending', 'paid'],
  paidDate: Date,
  paymentMethod: enum ['bank_transfer', 'upi', 'cash', 'cheque'],
  transactionRef: String,
  payslipUrl: String,      // path to generated PDF
  notes: String,
  paidBy: ObjectId→User
}
```

### 2.3 SupportTicket

```js
{
  ticketId: String,        // ZRC-TKT-00001 (auto-seq)
  clientId: ObjectId→Client,   // required
  raisedBy: ObjectId→User,     // required (client-role user)
  title: String,           // required
  description: String,     // required
  status: enum ['open', 'in_progress', 'resolved'],
  priority: enum ['low', 'medium', 'high'],
  assignedTo: ObjectId→User,
  replies: [{
    userId: ObjectId→User,
    message: String,
    createdAt: Date
  }],
  resolvedAt: Date
}
```

### 2.4 Model Updates

**User** — add field:
```js
salary: { type: Number, default: 0 }  // base monthly salary in INR
```

**Client** — add field:
```js
socialMetrics: [{
  platform: enum ['instagram', 'facebook', 'youtube', 'linkedin'],
  count: Number,
  recordedAt: Date,
  recordedBy: ObjectId→User
}]
```

**Invoice** — add field:
```js
lastReminderSentAt: { type: Date, default: null }
```

---

## 3. Backend — New Routes

| Mount | File | Purpose |
|---|---|---|
| `/api/expenses` | `routes/expense.routes.js` | Expense CRUD |
| `/api/hr` | `routes/hr.routes.js` | Salary records, payslip PDF |
| `/api/tickets` | `routes/ticket.routes.js` | Support tickets + replies |

### 3.1 Expense Routes

```
POST   /api/expenses          create expense
GET    /api/expenses          list (filter: category, month, year)
PATCH  /api/expenses/:id      update
DELETE /api/expenses/:id      hard delete (permanent)
```

### 3.2 HR Routes

```
GET    /api/hr/employees              list all employees (non-client users)
PATCH  /api/hr/employees/:id/salary   update base salary on User
POST   /api/hr/salaries               create salary record for month
GET    /api/hr/salaries               list (filter: employeeId, month, year)
PATCH  /api/hr/salaries/:id/pay       mark as paid, generate PDF
GET    /api/hr/salaries/:id/payslip   download PDF
```

### 3.3 Ticket Routes

```
POST   /api/tickets              client raises ticket
GET    /api/tickets              list (client sees own; team sees all)
GET    /api/tickets/:id          get single ticket with replies
PATCH  /api/tickets/:id/status   update status (team only)
PATCH  /api/tickets/:id/assign   assign to team member
POST   /api/tickets/:id/reply    add reply (client or team)
```

### 3.4 Client-Role Scoping (Controller Updates)

When `req.user.role === 'client'`, controllers must filter by `req.user.linkedClientId`:
- `project.controller.js` → `filter.clientId = req.user.linkedClientId`
- `content.controller.js` → `filter.clientId = req.user.linkedClientId`
- `finance.controller.js` (invoices) → `filter.clientId = req.user.linkedClientId`

### 3.5 Stats Controller — New Endpoints

```
GET /api/stats/pl?months=6        P&L: revenue, expenses, salaries, net profit per month (added to stats.routes.js)
GET /api/stats/reports            combined reports: revenue, client breakdown, team productivity, content pipeline (added to stats.routes.js)
GET /api/stats/clients/:id        single-client stats: total billed, collected, outstanding (added to stats.routes.js)
```

---

## 4. Email Notifications (mailer.js)

Six triggered emails:

| Function | Trigger | Recipient |
|---|---|---|
| `sendInvoiceEmail` | Invoice "Send" clicked | Client contact email |
| `sendPaymentReminderEmail` | Daily cron: overdue invoices | Client contact email |
| `sendPaymentReceivedEmail` | Payment logged | Client contact email |
| `sendSalaryPaidEmail` | Salary marked paid | Employee email (with payslip PDF attached) |
| `sendNewTicketEmail` | Client raises ticket | Account manager email |
| `sendTicketReplyEmail` | Team replies to ticket | Client contact email |

**Overdue check:** `startOverdueReminder()` called in `server.js` after DB connect. Runs every 24 hours via `setInterval`. Queries invoices where `status ∈ {sent, partial}` and `dueDate < now` and `lastReminderSentAt` is null or > 24 hours ago.

---

## 5. Frontend — Internal CRM Enhancements

### 5.1 Client Detail Page (`/clients/:id`)

Five tabs:

| Tab | Content |
|---|---|
| Overview | Company info (editable inline), services, contract MRR, health score, account manager, social follower history chart (line chart per platform), add new metric button |
| Projects | Table of client's projects: name, type, status, progress, PM, due date |
| Content | Current month's content calendar items: title, type, status, assignee |
| Invoices | All invoices: number, amount, paid, outstanding, due date, status badge, send/log-payment buttons |
| Notes | Editable textarea, auto-save on blur |

Back button returns to `/clients`. Client card in `Clients.jsx` navigates to `/clients/:id` on click.

### 5.2 Project Detail Page (`/projects/:id`)

Four tabs:

| Tab | Content |
|---|---|
| Overview | Project name, client, PM, budget, dates, progress ring, status/priority badges, description |
| Tasks | Kanban board filtered to this project only |
| Team | Member list (name, role, avatar), add member modal, remove button |
| Milestones | List milestones: title, due date, complete checkbox; add milestone form |

Back button returns to `/projects`. Project card navigates to `/projects/:id` on click.

### 5.3 Finance Page (4 tabs)

**Invoices tab** — existing functionality unchanged.

**Expenses tab:**
- Monthly bar chart (expenses by category)
- Table: date, category, vendor, description, amount, recurring badge
- "Add Expense" modal: category, description, amount, date, vendor, notes, recurring toggle

**Salaries tab:**
- Month/year picker (default: current month)
- Table per employee: name, role, base salary, bonus, deductions, net salary, status badge, "Pay" button, "Download Payslip" link
- "Generate Month" button: creates pending SalaryRecord for all employees for selected month if not already created

**P&L tab:**
- Date range picker (last 3/6/12 months)
- Summary cards: Total Revenue, Total Expenses, Total Salaries, Net Profit
- Line chart: Revenue vs Expenses+Salaries vs Net Profit per month
- Color-coded: profit (green), loss (red)

### 5.4 Reports Page (4 sections)

All data live from `/api/stats/reports`.

1. **Revenue Overview** — 12-month area chart: expected vs collected. Collection rate % badge.
2. **Client Revenue Breakdown** — Horizontal bar chart: top 10 clients by total billed. Table with billed/collected/outstanding per client.
3. **Team Productivity** — Bar chart: tasks completed per team member (last 30 days). Table with open/done/overdue counts per person.
4. **Content Pipeline** — Donut chart: content by status. Bar chart: content by type (reels, graphics, stories, etc).

### 5.5 HR Page (`/hr`)

- Employee list: name, role, department, base salary, status (active/inactive)
- "Add Employee" button → modal: name, email, password, role, department, base salary
- Click employee → edit modal: update role, department, base salary, activate/deactivate
- Filter by department

### 5.6 Tickets Page (`/tickets`) — Internal

- Table: ticket ID, client, title, status, priority, assigned to, raised date
- Click row → ticket detail: description, reply thread, status/assign controls
- "Reply" form at bottom
- Filter by status, client

### 5.7 Settings — Team Tab

- Lists all users (employees + clients)
- "Invite Employee" button → creates user with role + base salary
- Edit role, department for existing users

### 5.8 Sidebar Updates

New nav items added:
- `HR` (under Business section) → `/hr`
- `Tickets` (under Business section) → `/tickets`

---

## 6. Frontend — Client Portal

### 6.1 Layout

`ClientPortalLayout.jsx` — top navigation bar:
- Left: ZRC Media Network logo
- Center: Dashboard | Projects | Content | Invoices | Support
- Right: User avatar + name + logout

No sidebar. Clean white/light background. Professional, minimal.

### 6.2 Portal Pages

**`/portal/dashboard`**
- Welcome: "Hello [Client Name] 👋"
- Project progress cards (active projects only)
- Outstanding invoice amount banner (if any overdue)
- Recent content updates (last 5 content items with status)

**`/portal/projects`**
- Cards: project name, type tags, status badge, progress bar, PM name, start–end dates
- Read-only

**`/portal/content`**
- Monthly calendar view (same component as internal, read-only)
- Month navigator
- Status legend

**`/portal/invoices`**
- Table: invoice number, month, amount, paid, outstanding, due date, status
- View-only in Phase 2 — no PDF download (Phase 3)
- Total outstanding summary at bottom

**`/portal/tickets`**
- "Raise a Ticket" button → modal: title (text), description (textarea), priority (Low/Medium/High)
- List of their tickets: ID, title, status badge, raised date, last updated
- Click ticket → thread view: original description + reply messages + "Add Reply" form

---

## 7. File Structure Summary

### Backend — New Files
```
server/models/Expense.js
server/models/SalaryRecord.js
server/models/SupportTicket.js
server/controllers/expense.controller.js
server/controllers/salary.controller.js
server/controllers/ticket.controller.js
server/routes/expense.routes.js
server/routes/hr.routes.js
server/routes/ticket.routes.js
server/utils/mailer.js
```

### Backend — Modified Files
```
server/models/User.js           (+salary field)
server/models/Client.js         (+socialMetrics field)
server/models/Invoice.js        (+lastReminderSentAt field)
server/controllers/project.controller.js   (+client role scoping)
server/controllers/content.controller.js   (+client role scoping)
server/controllers/finance.controller.js   (+client role scoping)
server/controllers/stats.controller.js     (+pl, +reports endpoints)
server/app.js                   (+3 new route mounts, +mailer init)
server/package.json             (+pdfkit, +nodemailer)
```

### Frontend — New Files
```
client/src/pages/ClientDetail.jsx
client/src/pages/ProjectDetail.jsx
client/src/pages/HR.jsx
client/src/pages/Tickets.jsx
client/src/pages/portal/PortalLayout.jsx
client/src/pages/portal/Dashboard.jsx
client/src/pages/portal/Projects.jsx
client/src/pages/portal/Content.jsx
client/src/pages/portal/Invoices.jsx
client/src/pages/portal/Tickets.jsx
```

### Frontend — Modified Files
```
client/src/pages/Finance.jsx        (rewrite — 4 tabs)
client/src/pages/Reports.jsx        (rewrite — real content)
client/src/pages/Settings.jsx       (team tab works)
client/src/pages/Clients.jsx        (cards clickable)
client/src/pages/Projects.jsx       (cards clickable)
client/src/components/layout/Sidebar.jsx  (+HR, +Tickets links)
client/src/App.jsx                  (+portal routes + role detection)
client/src/lib/api.js               (+all new endpoints)
```

---

## 8. Constraints & Decisions

- **YAGNI:** No leave management, no attendance tracking, no API-based social metrics (Phase 3)
- **No new UI component library** — use existing Tailwind + Radix + Recharts setup
- **Permissions:** New routes use existing permission strings (`finance:dashboard` for expenses/salaries, `portal:access` for client portal routes)
- **PDF:** pdfkit generates payslip, saved to `uploads/payslips/`. No S3 — local filesystem only for now.
- **No real-time** — ticket replies require page refresh (no WebSocket needed for Phase 2)
- **Email:** Fire-and-forget — if email fails, log error but don't block API response
