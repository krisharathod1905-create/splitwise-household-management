import mongoose from "mongoose";
import AuditLog from "#models/auditLog.model.js";
import Counter from "#models/counter.model.js";
import DocumentSubmission from "#models/documentSubmission.model.js";
import Notification from "#models/notification.model.js";
import Token from "#models/token.model.js";
import {
  assertStaffCanAccessService,
  createDocumentDraft,
  getServiceRequirements,
  getSubmissionForCitizen,
  getSubmissionForStaff,
  openPrivateDocument,
  removePrivateDocument,
  savePrivateDocument,
  serializeSubmission,
} from "#services/document.service.js";
import { ApiError, asyncHandler, paginate, sendSuccess } from "#utils/utils.js";

const requireObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `Invalid ${label}.`);
};

export const createDraft = asyncHandler(async (req, res) => {
  const { officeId, serviceId } = req.body;
  requireObjectId(officeId, "officeId");
  requireObjectId(serviceId, "serviceId");
  const submission = await createDocumentDraft({ userId: req.user._id, officeId, serviceId });
  return sendSuccess(res, { submission: serializeSubmission(submission) }, "Document draft ready.", 201);
});

export const getDraft = asyncHandler(async (req, res) => {
  const { officeId, serviceId } = req.query;
  requireObjectId(officeId, "officeId");
  requireObjectId(serviceId, "serviceId");
  const submission = await DocumentSubmission.findOne({
    userId: req.user._id,
    officeId,
    serviceId,
    status: "draft",
    tokenId: { $exists: false },
  });
  return sendSuccess(res, { submission: submission ? serializeSubmission(submission) : null });
});

export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await getSubmissionForCitizen(req.params.submissionId, req.user._id);
  return sendSuccess(res, { submission: serializeSubmission(submission) });
});

export const uploadDocumentFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Select a document file to upload.");
  const submission = await getSubmissionForCitizen(req.params.submissionId, req.user._id);
  const document = submission.documents.find((item) => item.requirementId === req.params.requirementId);
  if (!document) throw new ApiError(404, "Document requirement not found.");
  const expiredReadyDocument = submission.status === "ready" && document?.status === "missing" && !document.storageKey;
  const missingDocumentInReview = submission.status === "under_review" && document.status === "missing" && !document.storageKey;
  if (!["draft", "submitted", "needs_changes"].includes(submission.status) && !expiredReadyDocument && !missingDocumentInReview) {
    throw new ApiError(409, "Documents can only be uploaded to a draft or a submission awaiting review or changes.");
  }

  const savedFile = await savePrivateDocument(req.file);
  try {
    if (document.storageKey) {
      document.versions.push({
        storageKey: document.storageKey,
        originalName: document.originalName,
        contentType: document.contentType,
        size: document.size,
        uploadedAt: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        reviewStatus: document.status === "approved" ? "approved" : document.status === "rejected" ? "rejected" : "pending",
        reviewReason: document.reviewReason,
        reviewedAt: document.reviewedAt,
        reviewedBy: document.reviewedBy,
      });
    }
    document.storageKey = savedFile.storageKey;
    document.contentType = savedFile.contentType;
    document.originalName = req.file.originalname.replace(/[\u0000-\u001f\u007f]/g, "").split(/[\\/]/).pop().slice(0, 180) || "document";
    document.size = req.file.size;
    document.uploadedAt = new Date();
    document.uploadedBy = req.user._id;
    document.status = "pending";
    document.reviewReason = undefined;
    document.reviewedAt = undefined;
    document.reviewedBy = undefined;
    submission.status = submission.tokenId ? "submitted" : "draft";
    await submission.save();
  } catch (error) {
    await removePrivateDocument(savedFile.storageKey);
    throw error;
  }
  if (submission.tokenId) {
    await Token.updateOne(
      { _id: submission.tokenId },
      { $set: { documentReadinessStatus: submission.status } }
    );
  }

  return sendSuccess(res, { submission: serializeSubmission(submission) }, "Document uploaded.");
});

const sendDocumentFile = async (res, document) => {
  if (!document?.storageKey) throw new ApiError(404, "Document file not found.");
  const buffer = await openPrivateDocument(document.storageKey);
  const fileName = (document.originalName || "document").replace(/["\r\n]/g, "_");
  res.set({
    "Content-Type": document.contentType,
    "Content-Length": buffer.length,
    "Content-Disposition": `inline; filename="${fileName.replace(/[^\x20-\x7e]/g, "_")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  });
  res.send(buffer);
};

export const getCitizenDocumentFile = asyncHandler(async (req, res) => {
  const submission = await getSubmissionForCitizen(req.params.submissionId, req.user._id);
  const document = submission.documents.find((item) => item.requirementId === req.params.requirementId);
  await sendDocumentFile(res, document);
});

export const listStaffSubmissions = asyncHandler(async (req, res) => {
  const { officeId } = req.query;
  requireObjectId(officeId, "officeId");
  if (req.user.role !== "admin") {
    const assigned = req.user.assignedOfficeIds?.some((id) => id.toString() === officeId);
    if (!assigned) throw new ApiError(403, "You are not assigned to this office.");
  }

  const { page, limit, skip } = paginate(req.query);
  const filter = {
    officeId,
    status: { $in: ["submitted", "under_review", "needs_changes"] },
    documents: { $elemMatch: { storageKey: { $exists: true, $ne: null } } },
  };
  if (req.user.role === "staff") {
    const counters = await Counter.find({ officeId, staffId: req.user._id }).select("supportedServiceIds").lean();
    const hasGeneralCounter = counters.some((counter) => !counter.supportedServiceIds?.length);
    const serviceIds = [...new Set(counters.flatMap((counter) => (counter.supportedServiceIds || []).map(String)))];
    if (!hasGeneralCounter) {
      if (!serviceIds.length) {
        return sendSuccess(res, { submissions: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      filter.serviceId = { $in: serviceIds };
    }
  }
  const [submissions, total] = await Promise.all([
    DocumentSubmission.find(filter)
      .sort({ submittedAt: 1, updatedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "fullName")
      .populate("officeId", "name")
      .populate("serviceId", "name serviceCode")
      .populate("tokenId", "tokenNumber status sequenceNumber")
      .lean(),
    DocumentSubmission.countDocuments(filter),
  ]);
  return sendSuccess(res, {
    submissions: submissions
      .sort((left, right) => (left.tokenId?.sequenceNumber ?? Number.MAX_SAFE_INTEGER) - (right.tokenId?.sequenceNumber ?? Number.MAX_SAFE_INTEGER))
      .map(serializeSubmission),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getStaffSubmission = asyncHandler(async (req, res) => {
  const submission = await getSubmissionForStaff(req.params.submissionId, req.user);
  await submission.populate([
    { path: "userId", select: "fullName" },
    { path: "officeId", select: "name" },
    { path: "serviceId", select: "name serviceCode" },
    { path: "tokenId", select: "tokenNumber status sequenceNumber" },
  ]);
  return sendSuccess(res, { submission: serializeSubmission(submission) });
});

export const getStaffDocumentFile = asyncHandler(async (req, res) => {
  const submission = await getSubmissionForStaff(req.params.submissionId, req.user);
  const document = submission.documents.find((item) => item.requirementId === req.params.requirementId);
  await sendDocumentFile(res, document);
});

export const reviewDocument = asyncHandler(async (req, res) => {
  const submission = await getSubmissionForStaff(req.params.submissionId, req.user);
  if (!["submitted", "under_review", "needs_changes"].includes(submission.status)) {
    throw new ApiError(409, "This submission is not available for review.");
  }
  const { status, reason = "" } = req.body;
  if (!["approved", "rejected"].includes(status)) throw new ApiError(400, "Review status must be approved or rejected.");
  if (status === "rejected" && !reason.trim()) throw new ApiError(400, "Provide a reason when requesting a replacement.");
  const document = submission.documents.find((item) => item.requirementId === req.params.requirementId);
  if (!document?.storageKey) throw new ApiError(404, "Uploaded document not found.");

  document.status = status;
  document.reviewReason = status === "rejected" ? reason.trim().slice(0, 500) : undefined;
  document.reviewedAt = new Date();
  document.reviewedBy = req.user._id;
  submission.lastReviewedAt = document.reviewedAt;
  const requiredDocuments = submission.documents.filter((item) => item.required);
  const rejectedDocuments = submission.documents.some((item) => item.status === "rejected");
  submission.status = rejectedDocuments
    ? "needs_changes"
    : requiredDocuments.every((item) => item.status === "approved") &&
      submission.documents.filter((item) => item.storageKey).every((item) => item.status === "approved")
      ? "ready"
      : "under_review";
  await submission.save();
  if (submission.tokenId) {
    await Token.updateOne(
      { _id: submission.tokenId },
      { $set: { documentReadinessStatus: submission.status } }
    );
  }

  await AuditLog.create({
    actorId: req.user._id,
    actorRole: req.user.role,
    eventType: status === "approved" ? "document_approved" : "document_rejected",
    officeId: submission.officeId,
    tokenId: submission.tokenId,
    details: { submissionId: submission._id, requirementId: document.requirementId },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  if (status === "rejected") {
    await Notification.create({
      userId: submission.userId,
      type: "document_update",
      title: "Document needs attention",
      message: `${document.name} needs to be replaced. ${document.reviewReason}`,
      relatedTokenId: submission.tokenId,
      relatedOfficeId: submission.officeId,
      metadata: { submissionId: submission._id },
    });
  } else if (submission.status === "ready") {
    await Notification.create({
      userId: submission.userId,
      type: "document_ready",
      title: "Documents verified",
      message: "Your required documents have been approved.",
      relatedTokenId: submission.tokenId,
      relatedOfficeId: submission.officeId,
      metadata: { submissionId: submission._id },
    });
  }
  return sendSuccess(res, { submission: serializeSubmission(submission) }, "Document review saved.");
});
