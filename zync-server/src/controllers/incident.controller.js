import mongoose from "mongoose";
import Incident from "../models/incident.model.js";
import Monitor from "../models/monitor.model.js";

// ---------------------------------------------------------------------------
// GET /api/incidents
// ---------------------------------------------------------------------------
export async function getIncidents(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {
      userId: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "monitorId", select: "name url" }),
      Incident.countDocuments(filter),
    ]);

    return res.status(200).json({
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/incidents/monitor/:monitorId
// ---------------------------------------------------------------------------
export async function getIncidentsByMonitorId(req, res, next) {
  try {
    const { monitorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    if (!mongoose.isValidObjectId(monitorId)) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // Tenant isolation: verify monitor belongs to the authenticated user
    const monitor = await Monitor.findOne({
      _id: monitorId,
      userId: req.user._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    const filter = {
      monitorId,
      userId: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "monitorId", select: "name url" }),
      Incident.countDocuments(filter),
    ]);

    return res.status(200).json({
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}
