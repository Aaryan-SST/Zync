import mongoose from "mongoose";
import { MONITOR_STATUSES } from "../config/constants.js";

// ── PingHistory sub-document schema ──────────────────────────────────────────
const pingHistorySchema = new mongoose.Schema(
  {
    timestamp: {
      type:    Date,
      default: Date.now,
    },
    responseTimeMs: {
      type: Number,
    },
    statusCode: {
      type: Number,
    },
    isSuccess: {
      type: Boolean,
    },
    errorMessage: {
      type: String,
    },
  },
  { _id: false } // no ObjectId per sub-document entry
);

// ── Monitor schema ────────────────────────────────────────────────────────────
const monitorSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    name: {
      type:      String,
      required:  [true, "Monitor name is required"],
      trim:      true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    url: {
      type:      String,
      required:  [true, "URL is required"],
      trim:      true,
      maxlength: [2048, "URL cannot exceed 2048 characters"],
    },
    intervalSeconds: {
      type:    Number,
      default: 60,
    },
    expectedStatusCode: {
      type:    Number,
      default: 200,
    },
    maxLatencyMs: {
      type:    Number,
      default: 500,
    },
    status: {
      type:    String,
      enum:    Object.values(MONITOR_STATUSES),
      default: MONITOR_STATUSES.OPERATIONAL,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    // ── Future-proof fields (Lab 3 ping worker & Lab 4 incident engine) ────────
    pingHistory: {
      type:    [pingHistorySchema],
      default: [],
    },
    consecutiveFailures: {
      type:    Number,
      default: 0,
      min:     [0, "consecutiveFailures cannot be negative"],
    },
    activeIncidentId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Incident", // Incident model will be defined in Lab 4
      default: null,
    },
    lastCheckedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Explicit Indexes ──────────────────────────────────────────────────────────
monitorSchema.index({ status: 1 });
monitorSchema.index({ isActive: 1, lastCheckedAt: 1 });
monitorSchema.index({ userId: 1, createdAt: -1 });

const Monitor = mongoose.model("Monitor", monitorSchema);
export default Monitor;
