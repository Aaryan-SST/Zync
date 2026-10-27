import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = Router();

// Rate limiters for brute-force & abuse protection
// Relies on app.set("trust proxy", 1) in server.js so real client IPs are evaluated behind Render proxy
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registrations per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: "Too many accounts created from this IP. Please try again after an hour.",
    });
  },
});

// Public routes with rate limiting
router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login",    loginLimiter,    validate(loginSchema),    login);

// Protected routes (valid JWT cookie required)
router.post("/logout", protectRoute, logout);
router.get("/me",      protectRoute, getMe);

export default router;
