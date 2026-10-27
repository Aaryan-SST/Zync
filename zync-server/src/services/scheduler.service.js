import Monitor from "../models/monitor.model.js";
import { processMonitor } from "./ping.service.js";
import config from "../config/env.js";

// =============================================================================
// SINGLE-INSTANCE ASSUMPTION:
// This in-memory scheduler is designed for a single-instance Node.js process.
// If multiple instances run against the same MongoDB instance, an external distributed
// lock or worker queue (e.g. Redis/BullMQ or MongoDB TTL-based leader election)
// should be implemented in production clustering scenarios.
// =============================================================================

let intervalId = null;
let isTicking = false;
const inFlightMonitorIds = new Set();

/**
 * Queries active monitors that are due for a health check:
 * 1. Monitors that have never been checked (lastCheckedAt == null)
 * 2. Monitors where (lastCheckedAt + intervalSeconds * 1000) <= now
 *
 * Excludes pingHistory to keep scheduler queries lean and performant.
 *
 * @returns {Promise<Array<object>>}
 */
async function findDueMonitors() {
  const now = new Date();

  return Monitor.find({
    isActive: true,
    $or: [
      { lastCheckedAt: null },
      {
        $expr: {
          $lte: [
            {
              $add: ["$lastCheckedAt", { $multiply: ["$intervalSeconds", 1000] }],
            },
            now,
          ],
        },
      },
    ],
  })
    .select({ pingHistory: 0 })
    .lean();
}

/**
 * Processes a batch of due monitors with bounded concurrency.
 *
 * @param {Array<object>} monitors
 */
async function executeBatch(monitors) {
  const concurrency = config.maxConcurrentPings;

  for (let i = 0; i < monitors.length; i += concurrency) {
    const chunk = monitors.slice(i, i + concurrency);

    await Promise.allSettled(
      chunk.map((monitor) => {
        const id = monitor._id.toString();

        if (inFlightMonitorIds.has(id)) {
          console.warn(`[scheduler] Monitor ${id} ping already in flight — skipping`);
          return Promise.resolve();
        }

        inFlightMonitorIds.add(id);
        return processMonitor(monitor).finally(() => {
          inFlightMonitorIds.delete(id);
        });
      })
    );
  }
}

/**
 * Executes a single scheduler tick cycle.
 * Protected by a re-entrancy lock to prevent overlapping ticks if queries/pings run long.
 */
export async function runScheduler() {
  if (isTicking) {
    console.warn("[scheduler] Previous tick still active — skipping this interval");
    return;
  }

  isTicking = true;
  try {
    const dueMonitors = await findDueMonitors();

    if (dueMonitors.length > 0) {
      console.log(`[scheduler] Found ${dueMonitors.length} due monitor(s) — executing pings`);
      await executeBatch(dueMonitors);
    }
  } catch (err) {
    // Tick-level catch ensures stray async errors never crash the process
    console.error("[scheduler] Tick execution error:", err.message);
  } finally {
    isTicking = false;
  }
}

/**
 * Initializes and starts the background heartbeat scheduler.
 */
export function startScheduler() {
  if (!config.enableScheduler) {
    console.log("[scheduler] ENABLE_SCHEDULER is false — background worker disabled");
    return;
  }

  if (intervalId) {
    console.warn("[scheduler] startScheduler called but scheduler is already running");
    return;
  }

  console.log(
    `[scheduler] Background heartbeat worker active (tick: ${config.schedulerTickMs}ms, maxConcurrency: ${config.maxConcurrentPings})`
  );

  // Defer first tick by one interval so server startup is not blocked
  intervalId = setInterval(() => {
    runScheduler().catch((err) => {
      console.error("[scheduler] Uncaught interval error:", err.message);
    });
  }, config.schedulerTickMs);

  if (intervalId.unref) {
    intervalId.unref();
  }
}

/**
 * Gracefully terminates the scheduler interval.
 */
export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Background heartbeat worker stopped");
  }
}
