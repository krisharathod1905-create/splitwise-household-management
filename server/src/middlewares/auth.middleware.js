import { ApiError } from "#utils/utils.js";
import { verifyAccessToken } from "#utils/jwt.utils.js";
import User from "#models/user.model.js";
import { asyncHandler } from "#utils/utils.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    throw new ApiError(401, "Authentication required. Please log in.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired. Please log in again.");
    }
    throw new ApiError(401, "Invalid authentication token.");
  }

  const user = await User.findById(decoded.userId).select("-passwordHash");
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or account disabled.");
  }

  req.user = user;
  next();
});

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required.");
    }
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action.");
    }
    next();
  };
};

export const requireStaff = requireRole("staff", "admin");
export const requireAdmin = requireRole("admin");
