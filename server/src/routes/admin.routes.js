import { Router } from "express";
import {
  getOverviewStats, getHourlyStats, getAdminCounters,
  createCounter, updateCounter, listStaff, createStaff, getAuditLogs,
} from "#controllers/admin.controller.js";
import { authenticate, requireAdmin } from "#middlewares/auth.middleware.js";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/stats/overview", getOverviewStats);
router.get("/stats/hourly", getHourlyStats);
router.get("/counters", getAdminCounters);
router.post("/counters", createCounter);
router.patch("/counters/:counterId", updateCounter);
router.get("/staff", listStaff);
router.post("/staff", createStaff);
router.get("/audit-logs", getAuditLogs);

export default router;
