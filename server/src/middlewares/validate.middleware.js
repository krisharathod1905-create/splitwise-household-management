import { z } from "zod";
import { ApiError } from "#utils/utils.js";

// Validates request body, query, or params against a Zod schema
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const data = source === "body" ? req.body
        : source === "query" ? req.query
        : req.params;
      const parsed = schema.parse(data);
      if (source === "body") req.body = parsed;
      else if (source === "query") req.validatedQuery = parsed;
      else req.validatedParams = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        throw new ApiError(400, "Validation failed.", errors);
      }
      next(err);
    }
  };
};
