import {
  registerUser,
  loginUser,
  googleLogin,
  refreshSession,
} from "#services/auth.service.js";
import { asyncHandler, sendSuccess, sanitizeUser } from "#utils/utils.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "#utils/jwt.utils.js";

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  const result = await registerUser({ fullName, email, password, phone });
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, "Account created successfully.", 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, "Login successful.");
});

export const googleLoginCtrl = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const result = await googleLogin({ idToken });
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, "Google login successful.");
});

export const refreshTokenCtrl = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await refreshSession(token);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, { accessToken: result.accessToken }, "Token refreshed.");
});

export const logout = asyncHandler(async (req, res) => {
  clearRefreshTokenCookie(res);
  return sendSuccess(res, null, "Logged out successfully.");
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, sanitizeUser(req.user), "User profile fetched.");
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, preferredLanguage, notificationPreferences } = req.body;
  const updateData = {};
  if (fullName) updateData.fullName = fullName.trim();
  if (phone !== undefined) updateData.phone = phone;
  if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
  if (notificationPreferences) updateData.notificationPreferences = notificationPreferences;

  const { default: User } = await import("#models/user.model.js");
  const updated = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
  return sendSuccess(res, sanitizeUser(updated), "Profile updated.");
});
