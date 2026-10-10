import { Router } from "express";
import {
  issueTokenCtrl, getMyTokensCtrl, getTokenByIdCtrl, cancelTokenCtrl, checkInCtrl,
  getTokenHistoryCtrl, callNextCtrl, startServiceCtrl, completeServiceCtrl,
  markMissedCtrl, updateCounterStatusCtrl, getStaffQueueCtrl, issueWalkInCtrl,
  liveQueueStatusCtrl, staffQrCheckInCtrl, getStaffCountersCtrl,
} from "#controllers/token.controller.js";
import { authenticate, requireStaff } from "#middlewares/auth.middleware.js";

const router = Router();

// All token routes require authentication
router.use(authenticate);

// Citizen
router.post("/issue", issueTokenCtrl);
router.get("/my", getMyTokensCtrl);
router.get("/history", getTokenHistoryCtrl);
router.get("/:tokenId", getTokenByIdCtrl);
router.post("/:tokenId/cancel", cancelTokenCtrl);
router.post("/:tokenId/checkin", checkInCtrl);

// Live queue status (public-ish — needs auth for now)
router.get("/queue/:officeId/:serviceId/live", liveQueueStatusCtrl);

// Staff
router.get("/staff/counters", requireStaff, getStaffCountersCtrl);
router.get("/staff/queue", requireStaff, getStaffQueueCtrl);
router.post("/staff/walkin", requireStaff, issueWalkInCtrl);
router.post("/staff/checkin/qr", requireStaff, staffQrCheckInCtrl);
router.post("/staff/counter/:counterId/call-next", requireStaff, callNextCtrl);
router.post("/staff/counter/:counterId/start-service", requireStaff, startServiceCtrl);
router.post("/staff/counter/:counterId/complete-service", requireStaff, completeServiceCtrl);
router.post("/staff/:tokenId/mark-missed", requireStaff, markMissedCtrl);
router.patch("/staff/counter/:counterId/status", requireStaff, updateCounterStatusCtrl);

export default router;
