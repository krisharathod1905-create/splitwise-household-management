import {
  issueToken,
  getMyCitizenTokens,
  getTokenById,
  cancelToken,
  checkInToken,
  callNextToken,
  startService,
  completeService,
  markTokenMissed,
  getLiveQueueStatus,
} from "#services/queue.service.js";
import { predictWaitTime } from "#services/prediction.service.js";
import Service from "#models/service.model.js";
import Token from "#models/token.model.js";
import Counter from "#models/counter.model.js";
import { asyncHandler, sendSuccess, ApiError, getDateKey, paginate } from "#utils/utils.js";

// Attach socket emitter from app
const getEmitter = (req) => req.app.locals.emitEvent;

// ─── Citizen Operations ───────────────────────────────────────────────────────

export const issueTokenCtrl = asyncHandler(async (req, res) => {
  const { officeId, serviceId, citizenTravelMinutes } = req.body;
  const service = await Service.findById(serviceId);
  if (!service || !service.enabled) throw new ApiError(404, "Service not found or not available.");
  if (service.officeId.toString() !== officeId) throw new ApiError(400, "Service does not belong to this office.");

  const token = await issueToken(
    { userId: req.user._id, officeId, serviceId, source: "remote", citizenTravelMinutes },
    service,
    getEmitter(req)
  );
  return sendSuccess(res, { token }, "Token issued successfully.", 201);
});

export const getMyTokensCtrl = asyncHandler(async (req, res) => {
  const tokens = await getMyCitizenTokens(req.user._id);
  return sendSuccess(res, { tokens });
});

export const getTokenByIdCtrl = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const token = await getTokenById(tokenId, req.user._id, req.user.role);
  const prediction = await predictWaitTime(tokenId);
  return sendSuccess(res, { token, prediction });
});

export const cancelTokenCtrl = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const token = await cancelToken(tokenId, req.user._id, getEmitter(req));
  return sendSuccess(res, { token }, "Token cancelled.");
});

export const checkInCtrl = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const { method, verificationNonce } = req.body;
  const token = await checkInToken(tokenId, req.user._id, method || "auto", verificationNonce);
  return sendSuccess(res, { token }, "Checked in successfully.");
});

export const getTokenHistoryCtrl = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [tokens, total] = await Promise.all([
    Token.find({
      userId: req.user._id,
      status: { $in: ["completed", "cancelled", "missed", "expired"] },
    })
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("officeId", "name department address")
      .populate("serviceId", "name serviceCode")
      .lean(),
    Token.countDocuments({
      userId: req.user._id,
      status: { $in: ["completed", "cancelled", "missed", "expired"] },
    }),
  ]);
  return sendSuccess(res, {
    tokens,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── Staff Operations ─────────────────────────────────────────────────────────

export const callNextCtrl = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const token = await callNextToken(counterId, req.user._id, getEmitter(req));
  return sendSuccess(res, { token }, "Next citizen called.");
});

export const startServiceCtrl = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const token = await startService(counterId, req.user._id, getEmitter(req));
  return sendSuccess(res, { token }, "Service started.");
});

export const completeServiceCtrl = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const token = await completeService(counterId, req.user._id, getEmitter(req));
  return sendSuccess(res, { token }, "Service completed.");
});

export const markMissedCtrl = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const token = await markTokenMissed(tokenId, req.user._id, getEmitter(req));
  return sendSuccess(res, { token }, "Token marked as missed.");
});

export const updateCounterStatusCtrl = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const { status, pauseReason } = req.body;
  const counter = await Counter.findById(counterId);
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.staffId?.toString() !== req.user._id.toString()) {
    if (req.user.role !== "admin") throw new ApiError(403, "Not authorized.");
  }
  counter.status = status;
  if (status === "paused") counter.pauseReason = pauseReason || "Staff break";
  if (status !== "paused") counter.pauseReason = undefined;
  counter.lastActivityAt = new Date();
  await counter.save();

  const emit = getEmitter(req);
  if (emit) emit("counter:statusChanged", { counterId, status, officeId: counter.officeId });

  return sendSuccess(res, { counter }, `Counter status updated to ${status}.`);
});

export const getStaffQueueCtrl = asyncHandler(async (req, res) => {
  const { officeId } = req.query;
  if (!officeId) throw new ApiError(400, "officeId query parameter required.");

  const queueDate = getDateKey();
  const tokens = await Token.find({
    officeId,
    queueDate,
    status: { $in: ["issued", "checked_in", "called", "in_service"] },
  })
    .sort({ status: -1, sequenceNumber: 1 })
    .populate("userId", "fullName phone")
    .populate("serviceId", "name serviceCode")
    .lean();

  return sendSuccess(res, { tokens, queueDate });
});

export const issueWalkInCtrl = asyncHandler(async (req, res) => {
  const { officeId, serviceId } = req.body;
  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found.");

  const token = await issueToken(
    { userId: req.user._id, officeId, serviceId, source: "staff_assisted" },
    service,
    getEmitter(req)
  );
  return sendSuccess(res, { token }, "Walk-in token issued.", 201);
});

// ─── Live Queue Status ────────────────────────────────────────────────────────
export const liveQueueStatusCtrl = asyncHandler(async (req, res) => {
  const { officeId, serviceId } = req.params;
  const status = await getLiveQueueStatus(officeId, serviceId);
  return sendSuccess(res, { status });
});
