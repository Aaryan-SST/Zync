export const MIN_INTERVAL_SECONDS    = 30;
export const MAX_INTERVAL_SECONDS    = 86400;   // 24 hours
export const MIN_LATENCY_MS          = 50;
export const MAX_LATENCY_MS          = 60000;   // 60 seconds
export const MIN_STATUS_CODE         = 100;
export const MAX_STATUS_CODE         = 599;
export const MAX_MONITOR_NAME_LENGTH = 100;
export const MAX_URL_LENGTH          = 2048;
export const PING_HISTORY_SLICE      = 20;      // entries returned in list queries

export const MONITOR_STATUSES = Object.freeze({
  OPERATIONAL: "OPERATIONAL",
  DEGRADED:    "DEGRADED",
  DOWN:        "DOWN",
});
