/**
 * High-resolution monotonic timing utility using process.hrtime.bigint().
 * Ensures time measurements are unaffected by system clock adjustments or NTP syncs.
 */

/**
 * Returns a high-resolution start timestamp in BigInt nanoseconds.
 * Call immediately before initiating an HTTP request.
 *
 * @returns {bigint}
 */
export function startTimer() {
  return process.hrtime.bigint();
}

/**
 * Calculates elapsed duration since the start timestamp and returns integer milliseconds.
 * Call immediately upon response completion or error catch.
 *
 * @param {bigint} start - BigInt timestamp from startTimer()
 * @returns {number} Integer milliseconds
 */
export function stopTimer(start) {
  const elapsedNs = process.hrtime.bigint() - start;
  return Math.round(Number(elapsedNs) / 1_000_000);
}
