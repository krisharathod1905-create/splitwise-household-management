import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorRole: {
      type: String,
      enum: ["citizen", "staff", "admin", "system"],
    },
    eventType: {
      type: String,
      required: true,
    },
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
    },
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ officeId: 1, createdAt: -1 });
auditLogSchema.index({ tokenId: 1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
