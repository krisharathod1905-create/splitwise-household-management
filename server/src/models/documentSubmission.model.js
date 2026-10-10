import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema(
  {
    storageKey: String,
    originalName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewReason: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const submittedDocumentSchema = new mongoose.Schema(
  {
    requirementId: { type: String, required: true },
    name: { type: String, required: true },
    instructions: String,
    required: { type: Boolean, default: true },
    status: { type: String, enum: ["missing", "pending", "approved", "rejected"], default: "missing" },
    storageKey: String,
    originalName: String,
    contentType: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewReason: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    versions: { type: [documentVersionSchema], default: [] },
  },
  { _id: false }
);

const documentSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", index: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "needs_changes", "ready"],
      default: "draft",
      index: true,
    },
    documents: { type: [submittedDocumentSchema], default: [] },
    submittedAt: Date,
    lastReviewedAt: Date,
  },
  { timestamps: true }
);

documentSubmissionSchema.index(
  { userId: 1, officeId: 1, serviceId: 1 },
  { unique: true, partialFilterExpression: { status: "draft" } }
);
documentSubmissionSchema.index({ officeId: 1, status: 1, updatedAt: -1 });

const DocumentSubmission = mongoose.model("DocumentSubmission", documentSubmissionSchema);
export default DocumentSubmission;
