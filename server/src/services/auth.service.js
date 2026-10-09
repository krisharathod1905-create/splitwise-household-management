import User from "#models/user.model.js";
import { ApiError } from "#utils/utils.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "#utils/jwt.utils.js";
import env from "#config/env.config.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export const registerUser = async ({ fullName, email, password, phone }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    phone,
    role: "citizen",
  });

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id, role: user.role });

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      notificationPreferences: user.notificationPreferences,
    },
    accessToken,
    refreshToken,
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been disabled. Please contact support.");
  }
  if (!user.passwordHash) {
    throw new ApiError(401, "This account uses Google Sign-In. Please log in with Google.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id, role: user.role });

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      notificationPreferences: user.notificationPreferences,
      assignedOfficeIds: user.assignedOfficeIds,
    },
    accessToken,
    refreshToken,
  };
};

export const googleLogin = async ({ idToken }) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, "Google authentication is not configured on this server.");
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    throw new ApiError(401, "Invalid Google token. Authentication failed.");
  }

  const payload = ticket.getPayload();
  const { sub: googleSubjectId, email, name, picture } = payload;

  if (!email) {
    throw new ApiError(400, "Google account does not have a verified email.");
  }

  // Find by Google subject ID or email
  let user = await User.findOne({
    $or: [{ googleSubjectId }, { email: email.toLowerCase() }],
  });

  if (user) {
    // Link Google ID if not already linked
    if (!user.googleSubjectId) {
      user.googleSubjectId = googleSubjectId;
    }
    if (!user.avatarUrl && picture) {
      user.avatarUrl = picture;
    }
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // Create new account
    user = await User.create({
      fullName: name || email.split("@")[0],
      email: email.toLowerCase(),
      googleSubjectId,
      avatarUrl: picture,
      role: "citizen",
      lastLoginAt: new Date(),
    });
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account disabled. Please contact support.");
  }

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id, role: user.role });

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      preferredLanguage: user.preferredLanguage,
      notificationPreferences: user.notificationPreferences,
      assignedOfficeIds: user.assignedOfficeIds,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not provided.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token. Please log in again.");
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or account disabled.");
  }

  const newAccessToken = generateAccessToken({ userId: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user._id, role: user.role });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
