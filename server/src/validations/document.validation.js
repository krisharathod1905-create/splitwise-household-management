import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "A valid identifier is required.");

export const createDocumentDraftSchema = z.object({
  officeId: objectId,
  serviceId: objectId,
});

export const documentDraftQuerySchema = z.object({
  officeId: objectId,
  serviceId: objectId,
});

export const documentReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional().default(""),
}).refine((value) => value.status !== "rejected" || value.reason.length > 0, {
  path: ["reason"],
  message: "A reason is required when requesting a replacement.",
});
