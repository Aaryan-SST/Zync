import { Router } from "express";

const router = Router();

/**
 * GET /api/health
 * Lightweight unauthenticated health check endpoint for cloud platform probes (e.g. Render).
 * Does not perform heavy database queries.
 */
router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
