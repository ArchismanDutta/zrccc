// server.js — Entry point
const http       = require("http");
const { PORT }   = require("./config/env");
const connectDB  = require("./config/db");
const app        = require("./app");

async function start() {
  try {
    await connectDB();

    // Auto-seed roles + default admin on first boot
    const { bootstrap } = require("./seeds/bootstrap");
    await bootstrap();

    const httpServer = http.createServer(app);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 ZRC CRM Server running on port ${PORT}`);
      console.log(`🔗 Health: http://localhost:${PORT}/health`);
      console.log(`📡 API:    http://localhost:${PORT}/api`);

      // Start overdue invoice reminder cron
      try {
        const { startOverdueReminder } = require("./utils/mailer");
        startOverdueReminder();
      } catch (err) {
        console.warn("⚠️ Mailer not initialized:", err.message);
      }
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
