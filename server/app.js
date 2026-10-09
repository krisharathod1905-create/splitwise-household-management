import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import env from "#config/env.config.js";
import authRoutes from "#routes/auth.routes.js";
import officeRoutes from "#routes/office.routes.js";
import tokenRoutes from "#routes/token.routes.js";
import adminRoutes from "#routes/admin.routes.js";
import notificationRoutes from "#routes/notification.routes.js";
import { errorHandler, notFoundHandler } from "#middlewares/error.middleware.js";

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limiter (per IP, 200 req/15min)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "QueueLess API is healthy",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ success: true, message: "Welcome to QueueLess API v1.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/offices", officeRoutes);
app.use("/api/v1/tokens", tokenRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
