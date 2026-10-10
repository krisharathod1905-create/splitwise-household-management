import multer from "multer";
import { ApiError } from "#utils/utils.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype)) {
      callback(new ApiError(415, "Upload a PDF, JPEG, or PNG document."));
      return;
    }
    callback(null, true);
  },
});

export const uploadDocument = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new ApiError(413, "Documents must be 10 MB or smaller."));
      return;
    }
    next(error);
  });
};
