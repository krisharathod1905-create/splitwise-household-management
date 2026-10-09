// ApiError — structured error with HTTP status code
export class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ApiResponse — standard success response
export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// asyncHandler — wraps async route handlers to catch errors
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// sendSuccess — send a standard success response
export const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// sendError — send a standard error response
export const sendError = (res, message = "An error occurred", statusCode = 500, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

// generateTokenNumber — human-readable token like RTO-A042
export const generateTokenNumber = (serviceCode, sequenceNumber) => {
  const paddedSeq = String(sequenceNumber).padStart(3, "0");
  return `${serviceCode}-${paddedSeq}`;
};

// sleep — async delay utility
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// paginate — compute skip/limit
export const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// getDateKey — YYYY-MM-DD for a date object
export const getDateKey = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

// sanitizeUser — remove sensitive fields from user object
export const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};
