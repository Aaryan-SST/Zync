import "dotenv/config";

const REQUIRED = ["MONGODB_URI", "JWT_SECRET"];

REQUIRED.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
});

const config = Object.freeze({
  port:         parseInt(process.env.PORT ?? "5000", 10),
  mongoUri:     process.env.MONGODB_URI,
  jwtSecret:    process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl:    process.env.CLIENT_URL ?? "http://localhost:5173",
  nodeEnv:          process.env.NODE_ENV ?? "development",
  isProd:           process.env.NODE_ENV === "production",
  allowPrivateUrls: process.env.ALLOW_PRIVATE_URLS === "true",
});

export default config;
