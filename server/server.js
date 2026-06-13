// server.js — Entry point
const http       = require("http");
const { PORT }   = require("./config/env");
const connectDB  = require("./config/db");
const app        = require("./app");
const User       = require("./models/User");
const Channel    = require("./models/Channel");

async function start() {
  try {
    await connectDB();

    // Auto-seed roles + default admin on first boot
    const { bootstrap } = require("./seeds/bootstrap");
    await bootstrap();

    const httpServer = http.createServer(app);

    const { Server } = require("socket.io");
    const { FRONTEND_ORIGINS, JWT_ACCESS_SECRET } = require("./config/env");
    const jwt = require("jsonwebtoken");

    const io = new Server(httpServer, {
      cors: {
        origin: FRONTEND_ORIGINS,
        credentials: true,
      },
    });

    // Socket.io auth middleware — reads JWT from cookie or auth handshake
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token ||
          socket.handshake.headers?.cookie?.split(";")
            .map(c => c.trim())
            .find(c => c.startsWith("accessToken="))
            ?.split("=")[1];
        if (!token) return next(new Error("No token"));

        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.id)
          .select("isActive tokenVersion")
          .lean();

        if (!user || !user.isActive) return next(new Error("Account deactivated"));
        if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
          return next(new Error("Session invalidated"));
        }

        socket.userId = String(decoded.id);
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      // Join personal room
      socket.join(socket.userId);

      socket.on("channel:join", async (channelId) => {
        try {
          const channel = await Channel.findById(channelId).select("participants").lean();
          if (!channel) return;
          const isParticipant = channel.participants.some(p => String(p) === socket.userId);
          if (isParticipant) socket.join(channelId);
        } catch (_) {}
      });

      socket.on("channel:leave", (channelId) => {
        socket.leave(channelId);
      });

      socket.on("message:send", async ({ channelId, body }) => {
        try {
          if (!body?.trim()) return;
          const channel = await Channel.findById(channelId);
          if (!channel) return;
          if (!channel.participants.some(p => String(p) === socket.userId)) return;

          const Message = require("./models/Message");
          const message = await Message.create({
            channelId,
            senderId: socket.userId,
            body: body.trim(),
            readBy: [socket.userId],
          });

          channel.lastMessage = body.trim().slice(0, 100);
          channel.lastAt = new Date();
          await channel.save();

          const populated = await message.populate("senderId", "name avatar");

          io.to(channelId).emit("message:receive", { channelId, message: populated });
        } catch (_) {}
      });

      socket.on("message:typing", ({ channelId }) => {
        socket.to(channelId).emit("message:typing", { channelId, userId: socket.userId });
      });
    });

    app.set("io", io);

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
