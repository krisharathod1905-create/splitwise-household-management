import { Router } from "express";
import {
  createDraft,
  getCitizenDocumentFile,
  getDraft,
  getStaffDocumentFile,
  getStaffSubmission,
  getSubmission,
  listStaffSubmissions,
  reviewDocument,
  uploadDocumentFile,
} from "#controllers/document.controller.js";
import { authenticate, requireStaff } from "#middlewares/auth.middleware.js";
import { uploadDocument } from "#middlewares/document-upload.middleware.js";
import { validate } from "#middlewares/validate.middleware.js";
import {
  createDocumentDraftSchema,
  documentDraftQuerySchema,
  documentReviewSchema,
} from "#validations/document.validation.js";

const router = Router();
router.use(authenticate);

router.post("/draft", validate(createDocumentDraftSchema), createDraft);
router.get("/draft", validate(documentDraftQuerySchema, "query"), getDraft);
router.get("/staff", requireStaff, listStaffSubmissions);
router.get("/staff/:submissionId", requireStaff, getStaffSubmission);
router.get("/staff/:submissionId/documents/:requirementId/file", requireStaff, getStaffDocumentFile);
router.patch(
  "/staff/:submissionId/documents/:requirementId/review",
  requireStaff,
  validate(documentReviewSchema),
  reviewDocument
);
router.post("/:submissionId/documents/:requirementId", uploadDocument, uploadDocumentFile);
router.get("/:submissionId/documents/:requirementId/file", getCitizenDocumentFile);
router.get("/:submissionId", getSubmission);

export default router;
