import { Router } from "express";
import {
  listOffices, getOfficeById, getOfficeServices, getOfficeLiveStatus,
  createOffice, updateOffice, createService, updateService,
} from "#controllers/office.controller.js";
import { authenticate, requireAdmin } from "#middlewares/auth.middleware.js";

const router = Router();

router.get("/", listOffices);
router.get("/:officeId", getOfficeById);
router.get("/:officeId/services", getOfficeServices);
router.get("/:officeId/live", getOfficeLiveStatus);

// Admin only
router.post("/", authenticate, requireAdmin, createOffice);
router.patch("/:officeId", authenticate, requireAdmin, updateOffice);
router.post("/:officeId/services", authenticate, requireAdmin, createService);
router.patch("/services/:serviceId", authenticate, requireAdmin, updateService);

export default router;
