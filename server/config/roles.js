// config/roles.js
// ZRC Media Network — Role hierarchy and permission definitions.
// Roles are stored in a dynamic Role collection in the DB,
// but this file defines the base permission sets per role slug.

const ROLE_LEVELS = {
  super_admin:          10,
  admin:                9,
  project_manager:      8,
  dept_head:            7,
  account_manager:      6,
  social_media_manager: 5,
  graphic_designer:     5,
  video_editor:         5,
  cinematographer:      5,
  content_writer:       5,
  web_developer:        5,
  employee:             4,
  client:               1,
};

// Granular permission strings
const P = {
  // Clients
  CLIENT_CREATE:       "clients:create",
  CLIENT_READ_ALL:     "clients:read:all",
  CLIENT_READ_OWN:     "clients:read:own",
  CLIENT_UPDATE:       "clients:update",
  CLIENT_DELETE:       "clients:delete",
  CLIENT_REASSIGN:     "clients:reassign",

  // Projects
  PROJECT_CREATE:      "projects:create",
  PROJECT_READ_ALL:    "projects:read:all",
  PROJECT_READ_OWN:    "projects:read:own",
  PROJECT_UPDATE:      "projects:update",
  PROJECT_DELETE:      "projects:delete",
  PROJECT_MANAGE_TEAM: "projects:manage-team",

  // Content
  CONTENT_CREATE:      "content:create",
  CONTENT_READ:        "content:read",
  CONTENT_UPDATE:      "content:update",
  CONTENT_APPROVE:     "content:approve",
  CONTENT_DELETE:      "content:delete",

  // Tasks
  TASK_CREATE:         "tasks:create",
  TASK_READ_ALL:       "tasks:read:all",
  TASK_READ_OWN:       "tasks:read:own",
  TASK_UPDATE:         "tasks:update",
  TASK_UPDATE_OWN:     "tasks:update:own",
  TASK_REVIEW:         "tasks:review",
  TASK_DELETE:         "tasks:delete",

  // Finance
  INVOICE_CREATE:      "invoices:create",
  INVOICE_READ_ALL:    "invoices:read:all",
  INVOICE_READ_OWN:    "invoices:read:own",
  INVOICE_UPDATE:      "invoices:update",
  INVOICE_SEND:        "invoices:send",
  PAYMENT_LOG:         "payments:log",
  PAYMENT_READ:        "payments:read",
  FINANCE_DASHBOARD:   "finance:dashboard",

  // Users
  USER_CREATE:         "users:create",
  USER_READ_ALL:       "users:read:all",
  USER_UPDATE:         "users:update",
  USER_DELETE:         "users:delete",
  USER_MANAGE_ROLES:   "users:manage-roles",

  // Reports
  REPORT_READ_ALL:     "reports:read:all",
  REPORT_READ_OWN:     "reports:read:own",

  // Settings
  SETTINGS_READ:       "settings:read",
  SETTINGS_UPDATE:     "settings:update",
  ROLE_MANAGE:         "roles:manage",
  DEPT_MANAGE:         "departments:manage",

  // Audit
  AUDIT_READ:          "audit:read",

  // Expenses
  EXPENSE_CREATE:      "expenses:create",
  EXPENSE_READ:        "expenses:read",
  EXPENSE_UPDATE:      "expenses:update",
  EXPENSE_DELETE:      "expenses:delete",

  // HR / Salaries
  SALARY_CREATE:       "hr:salaries:create",
  SALARY_READ:         "hr:salaries:read",
  SALARY_UPDATE:       "hr:salaries:update",
  EMPLOYEE_SALARY_UPDATE: "hr:employees:update-salary",

  // Support Tickets
  TICKET_CREATE:       "support:tickets:create",
  TICKET_READ:         "support:tickets:read",
  TICKET_UPDATE:       "support:tickets:update",
  TICKET_ASSIGN:       "support:tickets:assign",
  TICKET_REPLY:        "support:tickets:reply",

  // Portal
  PORTAL_ACCESS:       "portal:access",
};

// Base permission sets per role
const ROLE_PERMISSIONS = {
  super_admin: Object.values(P), // everything

  admin: Object.values(P).filter(p => p !== P.PORTAL_ACCESS),

  project_manager: [
    P.CLIENT_READ_OWN, P.PROJECT_CREATE, P.PROJECT_READ_ALL, P.PROJECT_UPDATE,
    P.PROJECT_MANAGE_TEAM, P.CONTENT_CREATE, P.CONTENT_READ, P.CONTENT_UPDATE,
    P.CONTENT_APPROVE, P.TASK_CREATE, P.TASK_READ_ALL, P.TASK_UPDATE,
    P.TASK_REVIEW, P.INVOICE_READ_OWN, P.REPORT_READ_OWN,
    P.EXPENSE_CREATE, P.EXPENSE_READ, P.EXPENSE_UPDATE,
    P.TICKET_CREATE, P.TICKET_READ, P.TICKET_UPDATE, P.TICKET_REPLY, P.TICKET_ASSIGN,
  ],

  dept_head: [
    P.PROJECT_READ_OWN, P.CONTENT_READ, P.CONTENT_APPROVE,
    P.TASK_CREATE, P.TASK_READ_ALL, P.TASK_UPDATE, P.TASK_REVIEW,
    P.REPORT_READ_OWN,
  ],

  account_manager: [
    P.CLIENT_CREATE, P.CLIENT_READ_OWN,
    P.PROJECT_READ_OWN, P.CONTENT_READ,
    P.TASK_CREATE, P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
    P.INVOICE_CREATE, P.INVOICE_READ_OWN, P.INVOICE_UPDATE, P.INVOICE_SEND,
    P.PAYMENT_LOG, P.PAYMENT_READ,
    P.EXPENSE_CREATE, P.EXPENSE_READ, P.EXPENSE_UPDATE,
    P.REPORT_READ_OWN,
    P.SALARY_READ,
    P.TICKET_CREATE, P.TICKET_READ, P.TICKET_UPDATE, P.TICKET_ASSIGN, P.TICKET_REPLY,
  ],

  social_media_manager: [
    P.PROJECT_READ_OWN, P.CONTENT_CREATE, P.CONTENT_READ, P.CONTENT_UPDATE,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  graphic_designer: [
    P.PROJECT_READ_OWN, P.CONTENT_READ, P.CONTENT_UPDATE,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  video_editor: [
    P.PROJECT_READ_OWN, P.CONTENT_READ, P.CONTENT_UPDATE,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  cinematographer: [
    P.PROJECT_READ_OWN, P.CONTENT_READ,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  content_writer: [
    P.PROJECT_READ_OWN, P.CONTENT_READ, P.CONTENT_UPDATE,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  web_developer: [
    P.PROJECT_READ_OWN,
    P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  employee: [
    P.PROJECT_READ_OWN, P.TASK_READ_OWN, P.TASK_UPDATE_OWN,
  ],

  client: [
    P.PORTAL_ACCESS,
    P.PROJECT_READ_OWN,
    P.CONTENT_READ, P.CONTENT_APPROVE,
    P.INVOICE_READ_OWN,
    P.TICKET_CREATE, P.TICKET_READ, P.TICKET_REPLY,
  ],
};

module.exports = { ROLE_LEVELS, PERMISSIONS: P, ROLE_PERMISSIONS };
