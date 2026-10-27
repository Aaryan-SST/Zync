import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login",    validate(loginSchema),    login);

// Protected routes (valid JWT cookie required)
router.post("/logout", protectRoute, logout);
router.get("/me",      protectRoute, getMe);

export default router;
