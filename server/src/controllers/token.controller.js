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
  checkInTokenByStaff,
} from "#services/queue.service.js";
import { predictWaitTime } from "#services/prediction.service.js";
import Service from "#models/service.model.js";
import Token from "#models/token.model.js";
import Counter from "#models/counter.model.js";
import DocumentSubmission from "#models/documentSubmission.model.js";
import { asyncHandler, sendSuccess, ApiError, getDateKey, paginate } from "#utils/utils.js";

// Attach socket emitter from app
const getEmitter = (req) => req.app.locals.emitEvent;

// ─── Citizen Operations ───────────────────────────────────────────────────────

export const issueTokenCtrl = asyncHandler(async (req, res) => {
  const { officeId, serviceId, citizenTravelMinutes, documentSubmissionId } = req.body;
  const service = await Service.findById(serviceId);
  if (!service || !service.enabled) throw new ApiError(404, "Service not found or not available.");
  if (service.officeId.toString() !== officeId) throw new ApiError(400, "Service does not belong to this office.");

  let submission;
  if (documentSubmissionId) {
    submission = await DocumentSubmission.findOne({
      _id: documentSubmissionId,
      userId: req.user._id,
      officeId,
      serviceId,
      status: "draft",
      tokenId: { $exists: false },
    });
    if (!submission) throw new ApiError(404, "Document draft not found or no longer available.");
  }
  const documentReadinessStatus = submission &&
    !submission.documents.some((document) => document.required) &&
    !submission.documents.some((document) => document.storageKey)
    ? "ready"
    : submission ? "submitted" : undefined;

  const token = await issueToken(
    {
      userId: req.user._id,
      officeId,
      serviceId,
      source: "remote",
      citizenTravelMinutes,
      documentSubmissionId: submission?._id,
      documentReadinessStatus,
    },
    service,
    getEmitter(req)
  );
  if (submission) {
    submission.tokenId = token._id;
    submission.status = documentReadinessStatus;
    submission.submittedAt = new Date();
    await submission.save();
    await Token.updateOne(
      { _id: token._id },
      { $set: { documentReadinessStatus: submission.status } }
    );
  }
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

export const staffQrCheckInCtrl = asyncHandler(async (req, res) => {
  const { qrCodeData, counterId } = req.body;
  if (typeof qrCodeData !== "string" || qrCodeData.length > 2048) {
    throw new ApiError(400, "A valid QR code payload is required.");
  }
  const token = await checkInTokenByStaff({
    qrCodeData,
    staff: req.user,
    counterId,
    emitFn: getEmitter(req),
  });
  return sendSuccess(res, { token }, "Token checked in successfully.");
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

export const getStaffCountersCtrl = asyncHandler(async (req, res) => {
  const query = req.user.role === "admin" ? {} : { staffId: req.user._id };
  const counters = await Counter.find(query)
    .populate("officeId", "name officeCode")
    .populate("supportedServiceIds", "name serviceCode")
    .populate("currentTokenId", "tokenNumber status")
    .sort({ counterNumber: 1 })
    .lean();
  return sendSuccess(res, { counters });
});

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
  const requestedOfficeId = req.query.officeId;
  const assignedCounter = req.user.role !== "admin"
    ? await Counter.findOne({ staffId: req.user._id }).select("officeId").lean()
    : null;
  const assignedOfficeId = assignedCounter?.officeId ||
    req.user.assignedOfficeId ||
    req.user.assignedOfficeIds?.[0];
  const officeId = req.user.role === "admin"
    ? requestedOfficeId || assignedOfficeId
    : assignedOfficeId;
  if (!officeId) throw new ApiError(400, "officeId query parameter required.");
  if (req.user.role !== "admin") {
    const assignedOfficeIds = req.user.assignedOfficeIds?.length
      ? req.user.assignedOfficeIds.map((id) => id.toString())
      : assignedOfficeId ? [assignedOfficeId.toString()] : [];
    if (
      assignedOfficeIds.length > 0 &&
      !assignedOfficeIds.includes(officeId.toString()) &&
      assignedCounter?.officeId?.toString() !== officeId.toString()
    ) {
      throw new ApiError(403, "You are not assigned to this office.");
    }
  }

  const queueDate = getDateKey();
  const activeStatuses = ["issued", "checked_in", "called", "in_service"];
  const [tokens, totalTokensToday, completedToday, avgService] = await Promise.all([
    Token.find({
      officeId,
      queueDate,
      status: { $in: activeStatuses },
    })
      .sort({ status: -1, sequenceNumber: 1 })
      .populate("userId", "fullName phone")
      .populate("serviceId", "name serviceCode")
      .populate("assignedCounterId", "counterNumber displayName")
      .lean(),
    Token.countDocuments({ officeId, queueDate }),
    Token.countDocuments({ officeId, queueDate, status: "completed" }),
    Token.aggregate([
      { $match: { officeId: new (await import("mongoose")).default.Types.ObjectId(officeId), queueDate, status: "completed", serviceStartedAt: { $exists: true }, completedAt: { $exists: true } } },
      { $group: { _id: null, average: { $avg: { $divide: [{ $subtract: ["$completedAt", "$serviceStartedAt"] }, 60000] } } } },
    ]),
  ]);

  const counters = await Counter.find({
    officeId,
    ...(req.user.role === "admin" ? {} : { staffId: req.user._id }),
  })
    .select("_id counterNumber displayName staffId status currentTokenId supportedServiceIds")
    .populate("currentTokenId", "tokenNumber status serviceId")
    .lean();

  return sendSuccess(res, {
    tokens,
    queueDate,
    counters,
    stats: {
      totalTokensToday,
      completedToday,
      avgProcessingMinutes: avgService[0]?.average ? Math.round(avgService[0].average) : 0,
    },
  });
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
