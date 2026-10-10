import test from "node:test";
import assert from "node:assert/strict";
import {
  createDocumentDraftSchema,
  documentReviewSchema,
} from "#validations/document.validation.js";
import { createServiceSchema } from "#validations/service.validation.js";

test("document draft validation requires valid office and service ids", () => {
  const result = createDocumentDraftSchema.safeParse({
    officeId: "507f1f77bcf86cd799439011",
    serviceId: "507f1f77bcf86cd799439012",
  });
  assert.equal(result.success, true);
  assert.equal(createDocumentDraftSchema.safeParse({ officeId: "office", serviceId: "service" }).success, false);
});

test("rejected documents require an actionable reason", () => {
  assert.equal(documentReviewSchema.safeParse({ status: "approved" }).success, true);
  assert.equal(documentReviewSchema.safeParse({ status: "rejected", reason: "Image is unreadable" }).success, true);
  assert.equal(documentReviewSchema.safeParse({ status: "rejected", reason: " " }).success, false);
});

test("service document requirements have unique stable ids and bounded labels", () => {
  const validService = {
    name: "Passport application",
    serviceCode: "PSP-NEW",
    documentRequirements: [
      { requirementId: "identity", name: "Identity proof", required: true },
      { requirementId: "photo", name: "Photo", required: false, instructions: "Recent photo" },
    ],
  };
  assert.equal(createServiceSchema.safeParse(validService).success, true);
  assert.equal(createServiceSchema.safeParse({
    ...validService,
    documentRequirements: [
      validService.documentRequirements[0],
      { ...validService.documentRequirements[1], requirementId: "identity" },
    ],
  }).success, false);
});
