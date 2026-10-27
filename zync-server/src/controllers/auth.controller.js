import User from "../models/user.model.js";
import { generateTokenAndSetCookie, getCookieOptions } from "../utils/generateToken.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Basic email format check (Zod validation arrives in Lab 2). */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitise and return a user object safe to send in responses. */
function sanitizeUser(user) {
  return {
    _id:       user._id,
    name:      user.name,
    email:     user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // ── Inline field-level validation (Zod replaces this in Lab 2) ──────────
    const errors = [];

    if (!name || !name.trim()) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (!email || !isValidEmail(email.trim())) {
      errors.push({ field: "email", message: "A valid email is required" });
    }

    if (!password || password.length < 8) {
      errors.push({ field: "password", message: "Password must be at least 8 characters" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Duplicate check (also caught below via 11000) ──────────────────────
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // ── Create user (pre-save hook hashes password) ────────────────────────
    const user = await User.create({
      name:     name.trim(),
      email:    normalizedEmail,
      password, // plaintext — hashed inside the pre-save hook
    });

    // ── Issue cookie & respond ─────────────────────────────────────────────
    generateTokenAndSetCookie(res, user._id);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    // Mongo duplicate-key race condition
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Explicitly select password for comparison (select:false by default)
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

    // ── Generic 401 for unknown email OR wrong password (prevents enumeration)
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    generateTokenAndSetCookie(res, user._id);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout  (requires protectRoute)
// ---------------------------------------------------------------------------
export async function logout(req, res, next) {
  try {
    // Clear the cookie using the same options it was set with (minus maxAge).
    // Browsers only delete a cookie when the clear request matches the original
    // secure / sameSite / path flags exactly.
    const { maxAge: _omit, ...clearOptions } = getCookieOptions();
    res.clearCookie("jwt", clearOptions);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me  (requires protectRoute)
// ---------------------------------------------------------------------------
export async function getMe(req, res, next) {
  try {
    // protectRoute attaches req.user (password already excluded)
    return res.status(200).json({ user: req.user });
  } catch (err) {
    next(err);
  }
}
