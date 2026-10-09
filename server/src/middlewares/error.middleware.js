import { ApiError } from "#utils/utils.js";
import env from "#config/env.config.js";

// Central error handler — must be registered LAST in Express
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `A record with this ${field} already exists.`
      : "Duplicate entry.";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = "Validation failed.";
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired.";
  }

  // In development, include stack trace
  const response = {
    success: false,
    message,
    errors,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  };

  if (env.NODE_ENV !== "test") {
    console.error(`[Error] ${statusCode} ${message}`, err.code === 11000 ? "" : err.stack?.split("\n")[1] || "");
  }

  return res.status(statusCode).json(response);
};

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
