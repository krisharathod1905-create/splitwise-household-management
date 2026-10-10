import Token from "#models/token.model.js";
import QueueSequence from "#models/queueSequence.model.js";
import Counter from "#models/counter.model.js";
import ServiceHistory from "#models/serviceHistory.model.js";
import AuditLog from "#models/auditLog.model.js";
import { ApiError, getDateKey } from "#utils/utils.js";
import { predictWaitTime, recalculateQueuePredictions } from "#services/prediction.service.js";

/**
 * Atomically allocate the next sequence number for a given office+service+date.
 */
const allocateSequenceNumber = async (officeId, serviceId, queueDate) => {
  const seq = await QueueSequence.findOneAndUpdate(
    { officeId, serviceId, queueDate },
    { $inc: { lastSequence: 1, totalIssued: 1 } },
    { upsert: true, new: true }
  );
  return seq.lastSequence;
};

/**
 * Issue a new token for a citizen.
 */
export const issueToken = async ({ userId, officeId, serviceId, source = "remote", citizenTravelMinutes, documentSubmissionId, documentReadinessStatus }, serviceDoc, emitFn) => {
  const queueDate = getDateKey();

  // Check for existing active token (idempotency guard)
  const existingActive = await Token.findOne({
    userId,
    officeId,
    serviceId,
    queueDate,
    status: { $in: ["issued", "checked_in", "called", "in_service"] },
  });

  if (existingActive) {
    throw new ApiError(409, "You already have an active token for this service today. Cancel it before booking a new one.");
  }

  // Atomically allocate sequence
  const sequenceNumber = await allocateSequenceNumber(officeId, serviceId, queueDate);

  // Build token number: {SERVICE_CODE}-{SEQ}
  const paddedSeq = String(sequenceNumber).padStart(3, "0");
  const tokenNumber = `${serviceDoc.serviceCode}-${paddedSeq}`;

  // Set arrival deadline (2 hours from now by default, configurable)
  const arrivalDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const token = await Token.create({
    userId,
    officeId,
    serviceId,
    documentSubmissionId,
    documentReadinessStatus: documentReadinessStatus || (documentSubmissionId ? "submitted" : undefined),
    tokenNumber,
    sequenceNumber,
    queueDate,
    status: "issued",
    source,
    issuedAt: new Date(),
    arrivalDeadline,
    citizenTravelMinutes,
  });

  // Generate QR verification nonce
  token.generateVerificationNonce();
  await token.save();

  // Calculate initial prediction
  const prediction = await predictWaitTime(token._id.toString());
  if (prediction) {
    await Token.findByIdAndUpdate(token._id, {
      estimatedWaitMinutes: prediction.estimatedWaitMinutes,
      predictedServiceStart: prediction.predictedServiceStart,
      lowerBoundMinutes: prediction.lowerBoundMinutes,
      upperBoundMinutes: prediction.upperBoundMinutes,
    });
  }

  // Audit log
  await AuditLog.create({
    actorId: userId,
    actorRole: "citizen",
    eventType: "token_issued",
    officeId,
    tokenId: token._id,
    details: { tokenNumber, serviceId, source },
  });

  // Broadcast queue update
  if (emitFn) {
    emitFn("token:issued", { officeId, serviceId, queueDate, tokenId: token._id });
    emitFn("queue:updated", { officeId, serviceId });
  }

  return { ...token.toObject(), prediction, verificationNonce: token.verificationNonce };
};

/**
 * Get all active + recent tokens for a citizen.
 */
export const getMyCitizenTokens = async (userId) => {
  return Token.find({ userId })
    .sort({ issuedAt: -1 })
    .limit(50)
    .populate("officeId", "name address department officeCode")
    .populate("serviceId", "name serviceCode expectedDurationMinutes")
    .populate("assignedCounterId", "counterNumber displayName")
    .lean();
};

/**
 * Get token by ID with authorization check.
 */
export const getTokenById = async (tokenId, requestingUserId, requestingUserRole) => {
  const token = await Token.findById(tokenId)
    .populate("officeId", "name address department officeCode operationalSettings")
    .populate("serviceId", "name serviceCode expectedDurationMinutes requiredDocuments documentRequirements")
    .populate("assignedCounterId", "counterNumber displayName")
    .lean();

  if (!token) throw new ApiError(404, "Token not found.");

  // Authorize: owner or staff/admin
  const isOwner = token.userId.toString() === requestingUserId.toString();
  const isStaffOrAdmin = ["staff", "admin"].includes(requestingUserRole);
  if (!isOwner && !isStaffOrAdmin) {
    throw new ApiError(403, "You are not authorized to view this token.");
  }

  return token;
};

/**
 * Cancel a citizen's own token.
 */
export const cancelToken = async (tokenId, userId, emitFn) => {
  const token = await Token.findOne({ _id: tokenId, userId });
  if (!token) throw new ApiError(404, "Token not found.");

  const cancellableStatuses = ["issued", "checked_in"];
  if (!cancellableStatuses.includes(token.status)) {
    throw new ApiError(400, `Cannot cancel a token with status "${token.status}".`);
  }

  token.status = "cancelled";
  token.cancelledAt = new Date();
  await token.save();

  await QueueSequence.findOneAndUpdate(
    { officeId: token.officeId, serviceId: token.serviceId, queueDate: token.queueDate },
    { $inc: { totalCancelled: 1 } }
  );

  await AuditLog.create({
    actorId: userId,
    actorRole: "citizen",
    eventType: "token_cancelled",
    officeId: token.officeId,
    tokenId: token._id,
  });

  if (emitFn) {
    await recalculateQueuePredictions(token.officeId, token.serviceId, token.queueDate, emitFn);
    emitFn("token:statusChanged", {
      tokenId,
      status: "cancelled",
      officeId: token.officeId,
      serviceId: token.serviceId,
    });
  }

  return token;
};

/**
 * Check in a citizen (by token owner via QR or self check-in).
 */
export const checkInToken = async (tokenId, userId, method = "auto", verificationNonce) => {
  const token = await Token.findOne({ _id: tokenId, userId });
  if (!token) throw new ApiError(404, "Token not found.");

  if (token.status !== "issued") {
    throw new ApiError(400, `Cannot check in a token with status "${token.status}".`);
  }

  if (method === "qr" && verificationNonce) {
    if (token.nonceUsed) {
      throw new ApiError(409, "QR code has already been used.");
    }
    const crypto = await import("crypto");
    const hash = crypto.default.createHash("sha256").update(verificationNonce).digest("hex");
    if (hash !== token.verificationNonceHash) {
      throw new ApiError(401, "Invalid QR verification code.");
    }
    token.nonceUsed = true;
  }

  token.status = "checked_in";
  token.checkedInAt = new Date();
  token.checkInData = { method, verifiedAt: new Date() };
  await token.save();

  return token;
};

// ─── Staff Operations ─────────────────────────────────────────────────────────

/**
 * Call the next eligible token for a counter.
 */
export const callNextToken = async (counterId, staffId, emitFn) => {
  const counter = await Counter.findById(counterId).populate("supportedServiceIds");
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.status === "paused") throw new ApiError(400, "Counter is paused.");
  if (counter.status === "offline") throw new ApiError(400, "Counter is offline.");
  if (counter.currentTokenId) throw new ApiError(400, "Counter already has an active token. Complete it first.");

  const staffCheck = counter.staffId?.toString() === staffId.toString();
  if (!staffCheck) throw new ApiError(403, "You are not assigned to this counter.");

  const queueDate = getDateKey();
  const serviceIds = counter.supportedServiceIds.map((s) => s._id);

  // Find next eligible token (checked_in first, then issued, lowest sequence)
  const nextToken = await Token.findOneAndUpdate(
    {
      officeId: counter.officeId,
      serviceId: { $in: serviceIds },
      queueDate,
      status: { $in: ["checked_in", "issued"] },
    },
    {
      status: "called",
      calledAt: new Date(),
      assignedCounterId: counterId,
    },
    {
      sort: { status: -1, sequenceNumber: 1 }, // checked_in (-1 sorts 'i' before 'c' alphabetically - need custom)
      new: true,
    }
  );

  if (!nextToken) throw new ApiError(404, "No eligible tokens waiting in queue.");

  // Update counter
  await Counter.findByIdAndUpdate(counterId, {
    status: "busy",
    currentTokenId: nextToken._id,
    lastActivityAt: new Date(),
    estimatedAvailableAt: new Date(Date.now() + 10 * 60 * 1000), // rough estimate
  });

  await AuditLog.create({
    actorId: staffId,
    actorRole: "staff",
    eventType: "token_called",
    officeId: counter.officeId,
    tokenId: nextToken._id,
    details: { counterId, tokenNumber: nextToken.tokenNumber },
  });

  if (emitFn) {
    emitFn("token:called", {
      tokenId: nextToken._id,
      userId: nextToken.userId,
      counterId,
      counterNumber: counter.counterNumber,
      officeId: counter.officeId,
    });
    emitFn("token:statusChanged", {
      tokenId: nextToken._id,
      status: "called",
      officeId: counter.officeId,
    });
    emitFn("counter:statusChanged", { counterId, status: "busy" });
  }

  return nextToken;
};

/**
 * Start service for the called token at a counter.
 */
export const startService = async (counterId, staffId, emitFn) => {
  const counter = await Counter.findById(counterId);
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.staffId?.toString() !== staffId.toString()) {
    throw new ApiError(403, "Not assigned to this counter.");
  }
  if (!counter.currentTokenId) throw new ApiError(400, "No token assigned to this counter.");

  const token = await Token.findByIdAndUpdate(
    counter.currentTokenId,
    { status: "in_service", serviceStartedAt: new Date() },
    { new: true }
  );

  if (!token) throw new ApiError(404, "Token not found.");

  if (emitFn) {
    emitFn("token:statusChanged", {
      tokenId: token._id,
      status: "in_service",
      officeId: counter.officeId,
    });
  }

  return token;
};

/**
 * Complete service for the current token at a counter.
 */
export const completeService = async (counterId, staffId, emitFn) => {
  const counter = await Counter.findById(counterId);
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.staffId?.toString() !== staffId.toString()) {
    throw new ApiError(403, "Not assigned to this counter.");
  }
  if (!counter.currentTokenId) throw new ApiError(400, "No active token at this counter.");

  const token = await Token.findById(counter.currentTokenId);
  if (!token) throw new ApiError(404, "Token not found.");

  const now = new Date();
  token.status = "completed";
  token.completedAt = now;
  await token.save();

  // Record service history for prediction engine
  if (token.serviceStartedAt) {
    const durationMs = now.getTime() - token.serviceStartedAt.getTime();
    const actualDurationMinutes = Math.round(durationMs / 60000);
    await ServiceHistory.create({
      officeId: token.officeId,
      serviceId: token.serviceId,
      tokenId: token._id,
      counterId,
      queueDate: token.queueDate,
      serviceStartedAt: token.serviceStartedAt,
      completedAt: now,
      actualDurationMinutes,
      waitMinutesActual: token.calledAt
        ? Math.round((token.calledAt.getTime() - token.issuedAt.getTime()) / 60000)
        : null,
    });
  }

  await QueueSequence.findOneAndUpdate(
    { officeId: token.officeId, serviceId: token.serviceId, queueDate: token.queueDate },
    { $inc: { totalCompleted: 1 } }
  );

  // Free counter
  await Counter.findByIdAndUpdate(counterId, {
    status: "available",
    currentTokenId: null,
    lastActivityAt: now,
    estimatedAvailableAt: now,
    $inc: { dailyServedCount: 1 },
  });

  await AuditLog.create({
    actorId: staffId,
    actorRole: "staff",
    eventType: "service_completed",
    officeId: counter.officeId,
    tokenId: token._id,
    details: { counterId, tokenNumber: token.tokenNumber },
  });

  if (emitFn) {
    emitFn("token:statusChanged", {
      tokenId: token._id,
      status: "completed",
      officeId: counter.officeId,
    });
    emitFn("counter:statusChanged", { counterId, status: "available" });
    emitFn("queue:updated", { officeId: counter.officeId, serviceId: token.serviceId });
    await recalculateQueuePredictions(token.officeId, token.serviceId, token.queueDate, emitFn);
  }

  return token;
};

/**
 * Mark a token as missed.
 */
export const markTokenMissed = async (tokenId, staffId, emitFn) => {
  const token = await Token.findByIdAndUpdate(
    tokenId,
    { status: "missed", missedAt: new Date() },
    { new: true }
  );
  if (!token) throw new ApiError(404, "Token not found.");

  await QueueSequence.findOneAndUpdate(
    { officeId: token.officeId, serviceId: token.serviceId, queueDate: token.queueDate },
    { $inc: { totalMissed: 1 } }
  );

  if (emitFn) {
    emitFn("token:statusChanged", { tokenId, status: "missed", officeId: token.officeId });
    await recalculateQueuePredictions(token.officeId, token.serviceId, token.queueDate, emitFn);
  }

  return token;
};

/**
 * Get the live queue status for an office+service.
 */
export const getLiveQueueStatus = async (officeId, serviceId) => {
  const queueDate = getDateKey();

  const [waiting, inService, completed, totalIssued] = await Promise.all([
    Token.countDocuments({ officeId, serviceId, queueDate, status: { $in: ["issued", "checked_in"] } }),
    Token.countDocuments({ officeId, serviceId, queueDate, status: { $in: ["called", "in_service"] } }),
    Token.countDocuments({ officeId, serviceId, queueDate, status: "completed" }),
    Token.countDocuments({ officeId, serviceId, queueDate }),
  ]);

  const currentlyServing = await Token.findOne({
    officeId,
    serviceId: serviceId || { $exists: true },
    queueDate,
    status: { $in: ["called", "in_service"] },
  })
    .sort({ calledAt: -1 })
    .select("tokenNumber")
    .lean();

  return {
    queueDate,
    waiting,
    inService,
    completed,
    totalIssued,
    currentlyServing: currentlyServing?.tokenNumber ?? null,
  };
};
