import { Router } from "express";
import { getNotifications, markRead, markAllRead } from "#controllers/notification.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";

const router = Router();
router.use(authenticate);

router.get("/", getNotifications);
router.post("/read-all", markAllRead);
router.patch("/:notificationId/read", markRead);

export default router;
