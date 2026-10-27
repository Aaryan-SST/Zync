import { z } from "zod";
import {
  MIN_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  MIN_LATENCY_MS,
  MAX_LATENCY_MS,
  MIN_STATUS_CODE,
  MAX_STATUS_CODE,
  MAX_MONITOR_NAME_LENGTH,
  MAX_URL_LENGTH,
} from "../config/constants.js";

/** Validates that a URL string is absolute, http/https only, and has no credentials. */
const urlSchema = z
  .string({ required_error: "URL is required" })
  .trim()
  .max(MAX_URL_LENGTH, `URL cannot exceed ${MAX_URL_LENGTH} characters`)
  .superRefine((val, ctx) => {
    let parsed;
    try {
      parsed = new URL(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must be a valid absolute URL (e.g. https://example.com)",
      });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL protocol must be http or https",
      });
    }
    if (parsed.username || parsed.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must not contain embedded credentials",
      });
    }
  });

export const createMonitorSchema = z
  .object({
    name: z
      .string({ required_error: "Monitor name is required" })
      .trim()
      .min(1, "Monitor name is required")
      .max(MAX_MONITOR_NAME_LENGTH, `Name cannot exceed ${MAX_MONITOR_NAME_LENGTH} characters`),
    url: urlSchema,
    intervalSeconds: z
      .number()
      .int("intervalSeconds must be a whole number")
      .min(MIN_INTERVAL_SECONDS, `Minimum interval is ${MIN_INTERVAL_SECONDS} seconds`)
      .max(MAX_INTERVAL_SECONDS, `Maximum interval is ${MAX_INTERVAL_SECONDS} seconds`)
      .default(60),
    expectedStatusCode: z
      .number()
      .int("expectedStatusCode must be a whole number")
      .min(MIN_STATUS_CODE, `Status code must be between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`)
      .max(MAX_STATUS_CODE, `Status code must be between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`)
      .default(200),
    maxLatencyMs: z
      .number()
      .int("maxLatencyMs must be a whole number")
      .min(MIN_LATENCY_MS, `Minimum latency threshold is ${MIN_LATENCY_MS}ms`)
      .max(MAX_LATENCY_MS, `Maximum latency threshold is ${MAX_LATENCY_MS}ms`)
      .default(500),
    isActive: z.boolean().default(true),
  })
  .strict("Unknown field in request body — server-managed fields cannot be set by clients");

export const updateMonitorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Monitor name cannot be empty")
      .max(MAX_MONITOR_NAME_LENGTH, `Name cannot exceed ${MAX_MONITOR_NAME_LENGTH} characters`)
      .optional(),
    url: urlSchema.optional(),
    intervalSeconds: z
      .number()
      .int("intervalSeconds must be a whole number")
      .min(MIN_INTERVAL_SECONDS, `Minimum interval is ${MIN_INTERVAL_SECONDS} seconds`)
      .max(MAX_INTERVAL_SECONDS, `Maximum interval is ${MAX_INTERVAL_SECONDS} seconds`)
      .optional(),
    expectedStatusCode: z
      .number()
      .int("expectedStatusCode must be a whole number")
      .min(MIN_STATUS_CODE, `Status code must be between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`)
      .max(MAX_STATUS_CODE, `Status code must be between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`)
      .optional(),
    maxLatencyMs: z
      .number()
      .int("maxLatencyMs must be a whole number")
      .min(MIN_LATENCY_MS, `Minimum latency threshold is ${MIN_LATENCY_MS}ms`)
      .max(MAX_LATENCY_MS, `Maximum latency threshold is ${MAX_LATENCY_MS}ms`)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict("Unknown field in request body — server-managed fields cannot be set by clients")
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
