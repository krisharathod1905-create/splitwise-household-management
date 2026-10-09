import { Router } from "express";
import {
  register, login, googleLoginCtrl, refreshTokenCtrl, logout, getMe, updateProfile
} from "#controllers/auth.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import { validate } from "#middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "#validations/auth.validation.js";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, googleLoginCtrl);
router.post("/refresh", refreshTokenCtrl);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);

export default router;
