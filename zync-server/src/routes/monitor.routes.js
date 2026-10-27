import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createMonitorSchema, updateMonitorSchema } from "../schemas/monitor.schema.js";
import {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
} from "../controllers/monitor.controller.js";

const router = Router();

// Every route in /api/monitors requires authentication
router.use(protectRoute);

router.post("/", validate(createMonitorSchema), createMonitor);
router.get("/", getMonitors);
router.get("/:id", getMonitorById);
router.put("/:id", validate(updateMonitorSchema), updateMonitor);
router.delete("/:id", deleteMonitor);

export default router;
