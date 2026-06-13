// app.js — Express application setup
const express = require("express");
const helmet  = require("helmet");
const cors    = require("cors");
const morgan  = require("morgan");
const cookieParser   = require("cookie-parser");
const mongoSanitize  = require("express-mongo-sanitize");
const { FRONTEND_ORIGINS, IS_PRODUCTION } = require("./config/env");
const { error: sendError } = require("./utils/response");
const { AppError } = require("./utils/errors");
const { apiLimiter } = require("./middleware/rateLimiter");

// Routes
const authRoutes         = require("./routes/auth.routes");
const userRoutes         = require("./routes/user.routes");
const clientRoutes       = require("./routes/client.routes");
const projectRoutes      = require("./routes/project.routes");
const taskRoutes         = require("./routes/task.routes");
const contentRoutes      = require("./routes/content.routes");
const financeRoutes      = require("./routes/finance.routes");
const statsRoutes        = require("./routes/stats.routes");
const notificationRoutes = require("./routes/notification.routes");
const expenseRoutes      = require("./routes/expense.routes");
const hrRoutes           = require("./routes/hr.routes");
const ticketRoutes       = require("./routes/ticket.routes");
const departmentRoutes   = require("./routes/department.routes");
const messageRoutes      = require("./routes/message.routes");
const auditRoutes        = require("./routes/audit.routes");

const app = express();

// ── Security Headers ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", "data:", "blob:"],
        connectSrc:  ["'self'", ...FRONTEND_ORIGINS],
        fontSrc:     ["'self'"],
        objectSrc:   ["'none'"],
      },
    },
    strictTransportSecurity: IS_PRODUCTION
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── Logging ───────────────────────────────────────────────────
app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: FRONTEND_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── NoSQL Injection Prevention ────────────────────────────────
app.use(mongoSanitize());

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ── Rate Limit ────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ── API Routes ────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/clients",       clientRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/tasks",         taskRoutes);
app.use("/api/content",       contentRoutes);
app.use("/api/finance",       financeRoutes);
app.use("/api/stats",         statsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/expenses",      expenseRoutes);
app.use("/api/hr",            hrRoutes);
app.use("/api/tickets",       ticketRoutes);
app.use("/api/departments",   departmentRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/audit",         auditRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.path}`, 404, "NOT_FOUND"));
});

// ── Global Error Handler ──────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (!err.isOperational) {
    console.error("💥 Unexpected error:", err);
  }

  if (!err.isOperational && IS_PRODUCTION) {
    return sendError(res, { code: "SERVER_ERROR", message: "Something went wrong" }, 500);
  }

  sendError(res, err);
});

module.exports = app;
