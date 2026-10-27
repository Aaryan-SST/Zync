import { z } from "zod";
import { INCIDENT_STATUSES } from "../config/constants.js";

export const getIncidentsQuerySchema = z.object({
  status: z.enum([INCIDENT_STATUSES.OPEN, INCIDENT_STATUSES.RESOLVED]).optional(),
  page:   z.coerce.number().int("page must be an integer").min(1, "page must be at least 1").default(1),
  limit:  z.coerce.number().int("limit must be an integer").min(1, "limit must be at least 1").max(100, "limit cannot exceed 100").default(20),
});
