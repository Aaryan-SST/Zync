import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { getIncidentsQuerySchema } from "../schemas/incident.schema.js";
import {
  getIncidents,
  getIncidentsByMonitorId,
} from "../controllers/incident.controller.js";

const router = Router();

// All incident endpoints require authentication
router.use(protectRoute);

router.get("/", validate(null, { query: getIncidentsQuerySchema }), getIncidents);
router.get("/monitor/:monitorId", validate(null, { query: getIncidentsQuerySchema }), getIncidentsByMonitorId);

export default router;
