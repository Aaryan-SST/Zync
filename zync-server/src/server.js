/**
 * server.js — Zync API entry point
 *
 * Boot order (intentional — future labs depend on this):
 *   1. Import config (validates env vars, exits on missing secrets)
 *   2. Connect to MongoDB Atlas
 *   3. Only THEN start the HTTP listener
 *
 * http.Server is created explicitly so Lab 5 can attach Socket.io to it.
 * The connectDB().then() callback is where Lab 3's background worker starts.
 */

import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// Config import must come first — triggers dotenv + required-var validation
import config from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import monitorRoutes from "./routes/monitor.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { startScheduler, stopScheduler } from "./services/scheduler.service.js";

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------
const app = express();

// Security headers (must precede routes)
app.use(helmet());

// CORS — exact CLIENT_URL only, never wildcard; credentials required for cookies
app.use(
  cors({
    origin:      config.clientUrl,
    credentials: true,
  })
);

// Body parsing — 10 kb limit prevents large-payload DoS
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parsing — must be mounted BEFORE routes that read req.cookies
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);

// Health-check (lightweight — no DB query)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Error handling (always last)
// ---------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// HTTP Server — explicit instance so Lab 5 can attach Socket.io
// ---------------------------------------------------------------------------
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Global safety net — log unhandled rejections and exit cleanly
// ---------------------------------------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled rejection:", reason);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception:", err.message);
  server.close(() => process.exit(1));
});

// ---------------------------------------------------------------------------
// Boot sequence: DB first, HTTP listener second
// Lab 3: startScheduler() launches once DB is connected and listener is bound
// ---------------------------------------------------------------------------
connectDB()
  .then(() => {
    server.listen(config.port, () => {
      console.log(
        `[server] Zync API running on port ${config.port} [${config.nodeEnv}]`
      );
      startScheduler();
    });
  })
  .catch((err) => {
    console.error("[server] Failed to connect to DB, shutting down:", err.message);
    process.exit(1);
  });

// ---------------------------------------------------------------------------
// Graceful shutdown handling
// ---------------------------------------------------------------------------
function handleShutdown(signal) {
  console.log(`[server] ${signal} signal received — shutting down gracefully`);
  stopScheduler();

  server.close(() => {
    console.log("[server] HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds if connections refuse to close
  setTimeout(() => {
    console.error("[server] Forced termination after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Export for future test utilities (Lab 4+)
export { server, app };
