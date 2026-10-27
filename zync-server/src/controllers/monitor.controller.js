import mongoose from "mongoose";
import Monitor from "../models/monitor.model.js";
import config from "../config/env.js";

// ---------------------------------------------------------------------------
// SSRF Protection Helpers
// ---------------------------------------------------------------------------

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\.\d+\.\d+\.\d+$/,                  // IPv4 loopback (127.0.0.0/8)
  /^10\.\d+\.\d+\.\d+$/,                   // RFC1918 class A (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,   // RFC1918 class B (172.16.0.0/12)
  /^192\.168\.\d+\.\d+$/,                  // RFC1918 class C (192.168.0.0/16)
  /^169\.254\.\d+\.\d+$/,                  // Link-local / Cloud metadata (169.254.0.0/16)
  /^\[?::1\]?$/,                           // IPv6 loopback
  /^\[?0:0:0:0:0:0:0:1\]?$/,               // IPv6 expanded loopback
  /^\[?fc[0-9a-f]{2}:/i,                   // IPv6 Unique Local Address (fc00::/7)
  /^\[?fd[0-9a-f]{2}:/i,                   // IPv6 Unique Local Address (fd00::/8)
  /^\[?fe80:/i,                            // IPv6 Link-Local
];

/**
 * Checks whether a URL points to a private, loopback, or link-local address.
 *
 * @param {string} urlString
 * @returns {boolean} true if host is private or invalid
 */
export function isPrivateUrl(urlString) {
  try {
    const { hostname } = new URL(urlString);
    const cleanHost = hostname.replace(/^\[|\]$/g, "").toLowerCase();
    return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(cleanHost) || pattern.test(hostname));
  } catch {
    return true; // malformed = treat as unsafe
  }
}

/**
 * Validates SSRF constraints based on environment configuration.
 *
 * @param {string} url
 * @param {import("express").Response} res
 * @returns {boolean} true if safe to proceed, false if response already sent
 */
function validateSsrf(url, res) {
  // If explicitly allowed (e.g. for local dev testing), skip check
  if (config.allowPrivateUrls) {
    return true;
  }

  // Enforce in production or whenever private URLs are disallowed
  if (config.isProd || !config.allowPrivateUrls) {
    if (isPrivateUrl(url)) {
      res.status(400).json({
        message: "Validation failed",
        errors: [
          {
            field: "url",
            message: "URL must not point to a private or loopback address",
          },
        ],
      });
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// POST /api/monitors
// ---------------------------------------------------------------------------
export async function createMonitor(req, res, next) {
  try {
    const { url } = req.body;

    if (!validateSsrf(url, res)) {
      return;
    }

    const monitor = await Monitor.create({
      ...req.body,
      userId: req.user._id, // Enforce tenant ownership from authenticated user
    });

    return res.status(201).json({ monitor });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/monitors
// ---------------------------------------------------------------------------
export async function getMonitors(req, res, next) {
  try {
    // Return only active monitors owned by current user, sorted newest-first.
    // Slice pingHistory to the last 20 entries to keep payloads small.
    const monitors = await Monitor.find({
      userId: req.user._id,
      isActive: true,
    })
      .select({ pingHistory: { $slice: -20 } })
      .sort({ createdAt: -1 });

    return res.status(200).json({ monitors });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/monitors/:id
// ---------------------------------------------------------------------------
export async function getMonitorById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // Scoped strictly by userId — returns 404 for non-existent or other user's monitor
    const monitor = await Monitor.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    return res.status(200).json({ monitor });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/monitors/:id
// ---------------------------------------------------------------------------
export async function updateMonitor(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    if (req.body.url && !validateSsrf(req.body.url, res)) {
      return;
    }

    // Atomic scoped update with runValidators
    const monitor = await Monitor.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    return res.status(200).json({ monitor });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/monitors/:id
// ---------------------------------------------------------------------------
export async function deleteMonitor(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // Atomic scoped deletion
    const deleted = await Monitor.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    return res.status(200).json({ message: "Monitor deleted successfully" });
  } catch (err) {
    next(err);
  }
}
