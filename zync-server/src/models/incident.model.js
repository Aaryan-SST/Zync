import mongoose from "mongoose";
import { INCIDENT_STATUSES } from "../config/constants.js";

const incidentSchema = new mongoose.Schema(
  {
    monitorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Monitor",
      required: true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    title: {
      type:     String,
      required: [true, "Incident title is required"],
      trim:     true,
    },
    status: {
      type:    String,
      enum:    Object.values(INCIDENT_STATUSES),
      default: INCIDENT_STATUSES.OPEN,
    },
    causeStatusCode: {
      type:    Number,
      default: null,
    },
    errorLog: {
      type:    String,
      default: null,
      trim:    true,
    },
    startedAt: {
      type:    Date,
      default: Date.now,
    },
    resolvedAt: {
      type:    Date,
      default: null,
    },
    downtimeSeconds: {
      type:    Number,
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

// ── Indexes ───────────────────────────────────────────────────────────────────
incidentSchema.index({ userId: 1, startedAt: -1 });

// Database-level guarantee: exactly ONE OPEN incident per monitor at any time
incidentSchema.index(
  { monitorId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "OPEN" },
    name: "unique_open_incident_per_monitor",
  }
);

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;
