import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../models/user.model.js";

/**
 * Middleware that protects routes from unauthenticated access.
 *
 * Reads the `jwt` cookie, verifies it, and attaches the corresponding user
 * (without password) to req.user before calling next().
 *
 * Returns 401 (never crashes) for:
 *   - missing cookie
 *   - malformed / expired / bad-signature token
 *   - valid token whose user no longer exists in the DB
 */
export async function protectRoute(req, res, next) {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Throws JsonWebTokenError / TokenExpiredError on any issue
    const decoded = jwt.verify(token, config.jwtSecret);

    // Confirm the user still exists; password excluded by default (select:false)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.user = user;
    next();
  } catch {
    // Catches all JWT errors, network hiccups, etc.
    return res.status(401).json({ message: "Not authenticated" });
  }
}
