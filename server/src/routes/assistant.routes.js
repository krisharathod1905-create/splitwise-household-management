import { Router } from "express";
import rateLimit from "express-rate-limit";
import { chatWithAssistant } from "#controllers/assistant.controller.js";
import { validate } from "#middlewares/validate.middleware.js";
import { assistantChatSchema } from "#validations/assistant.validation.js";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many assistant requests. Please try again later." },
});

router.post("/chat", chatLimiter, validate(assistantChatSchema), chatWithAssistant);

export default router;
