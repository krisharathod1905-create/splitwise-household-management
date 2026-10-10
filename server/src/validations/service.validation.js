import { z } from "zod";

const documentRequirementSchema = z.object({
  requirementId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500).optional().default(""),
  required: z.boolean().optional().default(true),
});

const documentRequirementsSchema = z.array(documentRequirementSchema).max(30).superRefine((items, context) => {
  const requirementIds = new Set();
  items.forEach((item, index) => {
    if (requirementIds.has(item.requirementId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "requirementId"],
        message: "Requirement identifiers must be unique.",
      });
    }
    requirementIds.add(item.requirementId);
  });
});

const serviceFields = {
  name: z.string().trim().min(1).max(120),
  serviceCode: z.string().trim().min(1).max(30),
  description: z.string().trim().max(2000).optional(),
  expectedDurationMinutes: z.number().int().min(1).max(1440).optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  documentRequirements: documentRequirementsSchema.optional(),
  dailyCapacity: z.number().int().min(1).optional(),
  category: z.enum([
    "passport",
    "driving_license",
    "vehicle_registration",
    "birth_certificate",
    "death_certificate",
    "land_records",
    "municipal",
    "general",
  ]).optional(),
  enabled: z.boolean().optional(),
};

export const createServiceSchema = z.object(serviceFields);
export const updateServiceSchema = z.object(serviceFields).partial().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one service field to update.",
});
