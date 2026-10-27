import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login",    login);

// Protected routes (valid JWT cookie required)
router.post("/logout", protectRoute, logout);
router.get("/me",      protectRoute, getMe);

export default router;
