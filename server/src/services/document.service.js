import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import env from "#config/env.config.js";
import Counter from "#models/counter.model.js";
import DocumentSubmission from "#models/documentSubmission.model.js";
import Notification from "#models/notification.model.js";
import Token from "#models/token.model.js";
import Service from "#models/service.model.js";
import { detectDocumentFileType } from "#utils/document-file.utils.js";
import { ApiError } from "#utils/utils.js";

const PRIVATE_DIRECTORY = path.resolve(process.cwd(), env.DOCUMENT_STORAGE_PATH);

export const getServiceRequirements = (service) => {
  if (service.documentRequirements?.length) {
    return service.documentRequirements.map((item) => ({
      requirementId: item.requirementId,
      name: item.name,
      instructions: item.instructions || "",
      required: item.required !== false,
    }));
  }
  return (service.requiredDocuments || []).map((name, index) => ({
    requirementId: `legacy-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`,
    name,
    instructions: "",
    required: true,
  }));
};

export const serializeSubmission = (submission) => {
  const result = submission.toObject ? submission.toObject() : { ...submission };
  result.documents = result.documents.map((document) => {
    const { storageKey, versions, uploadedBy, reviewedBy, ...publicDocument } = document;
    return { ...publicDocument, hasFile: Boolean(storageKey) };
  });
  return result;
};

export const getSubmissionForCitizen = async (submissionId, userId) => {
  const submission = await DocumentSubmission.findById(submissionId);
  if (!submission) throw new ApiError(404, "Document submission not found.");
  if (submission.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to access these documents.");
  }
  return submission;
};

export const assertStaffCanAccessService = async (user, officeId, serviceId) => {
  if (user.role === "admin") return;
  if (user.role !== "staff") throw new ApiError(403, "Staff access required.");
  const assigned = user.assignedOfficeIds?.some((id) => id.toString() === officeId.toString());
  if (!assigned) throw new ApiError(403, "You are not assigned to this office.");
  const counters = await Counter.find({ officeId, staffId: user._id })
    .select("supportedServiceIds")
    .lean();
  const canServe = counters.some((counter) =>
    !counter.supportedServiceIds?.length ||
    counter.supportedServiceIds.some((id) => id.toString() === serviceId.toString())
  );
  if (!canServe) throw new ApiError(403, "You are not assigned to verify this service.");
};

export const getSubmissionForStaff = async (submissionId, user) => {
  const submission = await DocumentSubmission.findById(submissionId);
  if (!submission) throw new ApiError(404, "Document submission not found.");
  await assertStaffCanAccessService(user, submission.officeId, submission.serviceId);
  return submission;
};

export const savePrivateDocument = async (file) => {
  const type = detectDocumentFileType(file.buffer);
  if (!type) throw new ApiError(415, "The file contents do not match a supported PDF, JPEG, or PNG format.");
  await fs.mkdir(PRIVATE_DIRECTORY, { recursive: true });
  const storageKey = `${crypto.randomUUID()}.${type.extension}`;
  await fs.writeFile(path.join(PRIVATE_DIRECTORY, storageKey), file.buffer, { flag: "wx" });
  return { storageKey, contentType: type.contentType };
};

export const openPrivateDocument = async (storageKey) => {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(storageKey || "")) {
    throw new ApiError(404, "Document file not found.");
  }
  try {
    return await fs.readFile(path.join(PRIVATE_DIRECTORY, storageKey));
  } catch (error) {
    if (error.code === "ENOENT") throw new ApiError(404, "Document file not found.");
    throw error;
  }
};

export const removePrivateDocument = async (storageKey) => {
  if (!storageKey) return;
  try {
    await fs.unlink(path.join(PRIVATE_DIRECTORY, storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

export const createDocumentDraft = async ({ userId, officeId, serviceId }) => {
  const service = await Service.findOne({ _id: serviceId, officeId, enabled: true });
  if (!service) throw new ApiError(404, "Service not found or not available.");
  const requirements = getServiceRequirements(service);
  if (!requirements.length) throw new ApiError(400, "This service has no document requirements.");

  let submission = await DocumentSubmission.findOne({
    userId,
    officeId,
    serviceId,
    status: "draft",
    tokenId: { $exists: false },
  });
  if (!submission) {
    submission = new DocumentSubmission({ userId, officeId, serviceId, status: "draft" });
  }

  const previousDocuments = new Map(submission.documents.map((document) => [document.requirementId, document]));
  const staleStorageKeys = [];
  for (const existing of submission.documents) {
    if (!requirements.some((requirement) => requirement.requirementId === existing.requirementId)) {
      if (existing.storageKey) staleStorageKeys.push(existing.storageKey);
      staleStorageKeys.push(...existing.versions.map((version) => version.storageKey).filter(Boolean));
    }
  }
  submission.documents = requirements.map((requirement) => {
    const existing = previousDocuments.get(requirement.requirementId);
    if (!existing) return { ...requirement, status: "missing" };
    existing.name = requirement.name;
    existing.instructions = requirement.instructions;
    existing.required = requirement.required;
    return existing;
  });
  await submission.save();
  for (const storageKey of staleStorageKeys) await removePrivateDocument(storageKey);
  return submission;
};

export const purgeExpiredDocumentFiles = async () => {
  const retentionDays = Number.isFinite(env.DOCUMENT_RETENTION_DAYS) && env.DOCUMENT_RETENTION_DAYS > 0
    ? env.DOCUMENT_RETENTION_DAYS
    : 90;
  const expiry = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const submissions = await DocumentSubmission.find({
    $or: [
      { "documents.uploadedAt": { $lte: expiry } },
      { "documents.versions.uploadedAt": { $lte: expiry } },
    ],
  });
  for (const submission of submissions) {
    let changed = false;
    let currentFileExpired = false;
    for (const document of submission.documents) {
      for (const version of document.versions) {
        if (version.storageKey && version.uploadedAt && version.uploadedAt <= expiry) {
          await removePrivateDocument(version.storageKey);
          version.storageKey = undefined;
          changed = true;
        }
      }
      if (document.storageKey && document.uploadedAt && document.uploadedAt <= expiry) {
        await removePrivateDocument(document.storageKey);
        document.storageKey = undefined;
        document.status = "missing";
        document.reviewReason = undefined;
        document.reviewedAt = undefined;
        document.reviewedBy = undefined;
        changed = true;
        currentFileExpired = true;
      }
    }
    if (changed) {
      if (submission.tokenId && currentFileExpired) {
        submission.status = "needs_changes";
      }
      await submission.save();
      if (submission.tokenId && currentFileExpired) {
        await Token.updateOne(
          { _id: submission.tokenId },
          { $set: { documentReadinessStatus: submission.status } }
        );
        await Notification.create({
          userId: submission.userId,
          type: "document_update",
          title: "Document file expired",
          message: "An uploaded document was removed under the document-retention policy. Re-upload it if it is still needed.",
          relatedTokenId: submission.tokenId,
          relatedOfficeId: submission.officeId,
          metadata: { submissionId: submission._id },
        });
      }
    }
  }
};
