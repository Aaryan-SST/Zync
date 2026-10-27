import jwt from "jsonwebtoken";
import config from "../config/env.js";

/**
 * Returns environment-aware cookie options.
 * Used for both setting and clearing the auth cookie so options stay in sync.
 * Omit maxAge when clearing (pass to res.clearCookie instead).
 */
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure:   config.isProd,           // true in production (HTTPS only)
    sameSite: config.isProd ? "none" : "lax", // "none" required with secure:true for cross-origin
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms — matches JWT_EXPIRES_IN default
  };
}

/**
 * Signs a JWT with payload { userId }, sets it as an httpOnly cookie on res,
 * and returns the signed token string.
 *
 * @param {import("express").Response} res
 * @param {string} userId  - MongoDB ObjectId as string
 * @returns {string} signed JWT
 */
export function generateTokenAndSetCookie(res, userId) {
  const token = jwt.sign({ userId: userId.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.cookie("jwt", token, getCookieOptions());
  return token;
}
