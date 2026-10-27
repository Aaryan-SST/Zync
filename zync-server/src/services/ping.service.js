import axios from "axios";
import Monitor from "../models/monitor.model.js";
import config from "../config/env.js";
import { isPrivateUrl } from "../controllers/monitor.controller.js";
import { startTimer, stopTimer } from "../utils/latencyCalculator.js";
import { MONITOR_STATUSES } from "../config/constants.js";

const MAX_ERROR_MESSAGE_LENGTH = 300;
const PING_HISTORY_CAP = 50;

// ── Shared Axios client instance ─────────────────────────────────────────────
const axiosClient = axios.create({
  validateStatus: () => true, // 4xx / 5xx treated as responses rather than thrown exceptions
  maxRedirects: 5,
  maxContentLength: 1024,     // discard body; headers and status are all that's evaluated
  responseType: "stream",     // stream response discarded immediately to prevent buffering
});

// ── Pure Health State Machine ────────────────────────────────────────────────
/**
 * Evaluates the health state of a monitor based on the raw ping result.
 * Deterministic, pure function without side-effects or DB dependencies.
 *
 * @param {{ statusCode: number|null, responseTimeMs: number }} result
 * @param {{ expectedStatusCode: number, maxLatencyMs: number }} monitor
 * @returns {{ newStatus: string, isSuccess: boolean }}
 */
export function evaluateHealth(result, monitor) {
  const { statusCode, responseTimeMs } = result;

  // No HTTP response (timeout/network/DNS failure) or non-matching status code
  if (!statusCode || statusCode !== monitor.expectedStatusCode) {
    return {
      newStatus: MONITOR_STATUSES.DOWN,
      isSuccess: false,
    };
  }

  // Response received with expected status code, check latency bounds
  if (responseTimeMs > monitor.maxLatencyMs) {
    return {
      newStatus: MONITOR_STATUSES.DEGRADED,
      isSuccess: true,
    };
  }

  return {
    newStatus: MONITOR_STATUSES.OPERATIONAL,
    isSuccess: true,
  };
}

// ── Error Classifier ─────────────────────────────────────────────────────────
function classifyError(err) {
  const code = err.code ?? "";
  if (
    err.name === "AbortError" ||
    err.name === "TimeoutError" ||
    code === "ERR_CANCELED" ||
    code === "ECONNABORTED" ||
    err.message?.toLowerCase().includes("timeout")
  ) {
    return "Request timed out";
  }
  if (code === "ENOTFOUND") return "DNS resolution failed";
  if (code === "ECONNREFUSED") return "Connection refused";
  if (code === "ECONNRESET") return "Connection reset by peer";
  if (
    code === "CERT_HAS_EXPIRED" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    err.message?.toLowerCase().includes("certificate")
  ) {
    return "TLS/certificate error";
  }

  const rawMessage = err.message ?? "Unknown network error";
  return rawMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

// ── HTTP Endpoint Ping Execution ─────────────────────────────────────────────
/**
 * Dispatches an HTTP GET request to the target URL, measuring latency monotonically.
 *
 * @param {{ url: string }} monitor
 * @returns {Promise<{ statusCode: number|null, responseTimeMs: number, errorMessage: string|null }>}
 */
export async function pingEndpoint(monitor) {
  const start = startTimer();
  try {
    const response = await axiosClient.get(monitor.url, {
      timeout: config.pingTimeoutMs,
      signal: AbortSignal.timeout(config.pingTimeoutMs),
      headers: { "User-Agent": "Zync-Monitor/1.0" },
    });

    // Immediately destroy the stream body to prevent memory leak
    if (response.data && typeof response.data.destroy === "function") {
      response.data.destroy();
    }

    const responseTimeMs = stopTimer(start);
    return {
      statusCode: response.status,
      responseTimeMs,
      errorMessage: null,
    };
  } catch (err) {
    const responseTimeMs = stopTimer(start);
    return {
      statusCode: null,
      responseTimeMs,
      errorMessage: classifyError(err),
    };
  }
}

// ── Extension Seam (Labs 4 & 5 plug in here) ─────────────────────────────────
/**
 * Post-ping lifecycle hook. Executed after the ping outcome is persisted.
 *
 * @param {import("mongoose").Document|null} updatedMonitor - Monitor doc after atomic update
 * @param {string} previousStatus - Status prior to current ping
 * @param {object} pingResult - Full ping outcome { statusCode, responseTimeMs, isSuccess, newStatus, errorMessage }
 */
export async function handlePostPing(updatedMonitor, previousStatus, pingResult) {
  // Lab 4: Failure counter increment/reset and incident lifecycle automation
  // Lab 5: Socket.io real-time event broadcasting
}

// ── Per-Monitor Processor ────────────────────────────────────────────────────
/**
 * Manages full lifecycle for pinging a single monitor:
 * SSRF validation -> HTTP Ping -> State Machine -> Atomic DB Write -> PostPing Hook
 *
 * @param {object} monitor - Lean monitor document from scheduler query
 */
export async function processMonitor(monitor) {
  const previousStatus = monitor.status;

  // SSRF defense-in-depth: re-check hostname prior to socket connection
  if (config.isProd && !config.allowPrivateUrls && isPrivateUrl(monitor.url)) {
    const pingResult = {
      statusCode: null,
      responseTimeMs: 0,
      isSuccess: false,
      newStatus: MONITOR_STATUSES.DOWN,
      errorMessage: "URL blocked: private or loopback address (SSRF protection)",
    };

    const updated = await persistPingResult(monitor, pingResult);
    if (updated) {
      try {
        await handlePostPing(updated, previousStatus, pingResult);
      } catch (err) {
        console.error(`[ping] handlePostPing error on monitor ${monitor._id}:`, err.message);
      }
    }
    return;
  }

  const raw = await pingEndpoint(monitor);
  const { newStatus, isSuccess } = evaluateHealth(raw, monitor);
  const pingResult = { ...raw, isSuccess, newStatus };

  const updatedMonitor = await persistPingResult(monitor, pingResult);

  // If the document was deleted or deactivated mid-flight, updatedMonitor is null
  if (updatedMonitor) {
    try {
      await handlePostPing(updatedMonitor, previousStatus, pingResult);
    } catch (err) {
      console.error(`[ping] handlePostPing error on monitor ${monitor._id}:`, err.message);
    }
  }
}

// ── Atomic Database Persistence ──────────────────────────────────────────────
async function persistPingResult(monitor, pingResult) {
  const { newStatus, statusCode, responseTimeMs, isSuccess, errorMessage } = pingResult;
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    responseTimeMs,
    statusCode: statusCode ?? null,
    isSuccess,
    errorMessage: errorMessage ?? null,
  };

  // Atomic update: sets new status and lastCheckedAt, and prepends/appends history capped at 50
  // Returns null quietly if the document no longer exists
  const updated = await Monitor.findOneAndUpdate(
    { _id: monitor._id, isActive: true },
    {
      $set: {
        status: newStatus,
        lastCheckedAt: now,
      },
      $push: {
        pingHistory: {
          $each: [historyEntry],
          $slice: -PING_HISTORY_CAP, // Keep only the latest 50 entries
        },
      },
    },
    { new: true }
  );

  return updated;
}
