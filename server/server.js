import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { connectDB } from "#config/db.config.js";
import env from "#config/env.config.js";
import { purgeExpiredDocumentFiles } from "#services/document.service.js";

const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  transports: ["websocket", "polling"],
});

// Room naming conventions:
// "office:{officeId}"          - all updates for an office
// "queue:{officeId}:{serviceId}" - specific queue updates
// "user:{userId}"              - private user-scoped events

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join office room for public queue updates
  socket.on("join:office", ({ officeId }) => {
    if (officeId) {
      socket.join(`office:${officeId}`);
      console.log(`[Socket.IO] ${socket.id} joined office:${officeId}`);
    }
  });

  // Join queue-specific room
  socket.on("join:queue", ({ officeId, serviceId }) => {
    if (officeId && serviceId) {
      socket.join(`queue:${officeId}:${serviceId}`);
    }
  });

  // Join personal room for token tracking (authenticated)
  socket.on("join:user", ({ userId }) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on("leave:office", ({ officeId }) => {
    socket.leave(`office:${officeId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ─── Event Emitter (attached to app.locals for controllers) ──────────────────
app.locals.emitEvent = (eventName, payload) => {
  const { officeId, serviceId, userId, tokenId } = payload || {};

  // Emit to relevant rooms
  if (officeId) {
    io.to(`office:${officeId}`).emit(eventName, payload);
  }
  if (officeId && serviceId) {
    io.to(`queue:${officeId}:${serviceId}`).emit(eventName, payload);
  }
  if (userId) {
    io.to(`user:${userId}`).emit(eventName, payload);
  }

  // Always emit to global admin room
  io.emit(`admin:${eventName}`, payload);
};

// ─── Startup ─────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    purgeExpiredDocumentFiles().catch((err) => {
      console.error("[Documents] Initial retention cleanup failed:", err);
    });
    setInterval(() => {
      purgeExpiredDocumentFiles().catch((err) => {
        console.error("[Documents] Retention cleanup failed:", err);
      });
    }, 24 * 60 * 60 * 1000).unref();

    httpServer.listen(env.PORT, () => {
      console.log(`\n╔══════════════════════════════════════════╗`);
      console.log(`║  🚀 QueueLess Server Running              ║`);
      console.log(`║  Port: ${env.PORT.toString().padEnd(35)}║`);
      console.log(`║  Mode: ${env.NODE_ENV.padEnd(35)}║`);
      console.log(`║  DB:   ${env.DB_NAME.padEnd(35)}║`);
      console.log(`╚══════════════════════════════════════════╝\n`);
    });
  } catch (err) {
    console.error("[Server] Startup failed:", err);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    const { disconnectDB } = await import("#config/db.config.js");
    await disconnectDB();
    console.log("[Server] Shut down complete.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Rejection:", reason);
});

startServer();

export { io };
