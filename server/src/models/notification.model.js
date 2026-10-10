import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "token_issued",
        "queue_faster",
        "queue_delayed",
        "five_ahead",
        "two_ahead",
        "checkin_reminder",
        "token_called",
        "counter_assigned",
        "token_missed",
        "token_cancelled",
        "office_disruption",
        "token_completed",
        "document_update",
        "document_ready",
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
    channel: {
      type: String,
      enum: ["in_app", "email", "both"],
      default: "in_app",
    },
    emailDelivered: { type: Boolean, default: false },
    deduplicationKey: {
      type: String,
      index: true,
    },
    relatedTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
    },
    relatedOfficeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
