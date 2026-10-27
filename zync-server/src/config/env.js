import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

const REQUIRED = ["MONGODB_URI", "JWT_SECRET"];
if (isProd) {
  REQUIRED.push("CLIENT_URL");
}

REQUIRED.forEach((key) => {
  if (!process.env[key] || process.env[key].trim() === "") {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
});

// Enforce no trailing slash on CLIENT_URL in production to guarantee strict CORS matches
if (isProd && process.env.CLIENT_URL) {
  if (process.env.CLIENT_URL.endsWith("/")) {
    console.error(
      `[config] CLIENT_URL must not have a trailing slash: "${process.env.CLIENT_URL}"`
    );
    process.exit(1);
  }
}

const config = Object.freeze({
  port:         parseInt(process.env.PORT ?? "5000", 10),
  mongoUri:     process.env.MONGODB_URI,
  jwtSecret:    process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl:    process.env.CLIENT_URL
    ? process.env.CLIENT_URL.trim().replace(/\/+$/, "")
    : "http://localhost:5173",
  nodeEnv:          process.env.NODE_ENV ?? "development",
  isProd,
  allowPrivateUrls: process.env.ALLOW_PRIVATE_URLS === "true",
  enableScheduler:  process.env.ENABLE_SCHEDULER !== "false",
  schedulerTickMs:  parseInt(process.env.SCHEDULER_TICK_MS ?? "5000", 10),
  pingTimeoutMs:    parseInt(process.env.PING_TIMEOUT_MS ?? "10000", 10),
  maxConcurrentPings: parseInt(process.env.MAX_CONCURRENT_PINGS ?? "10", 10),
});

export default config;
