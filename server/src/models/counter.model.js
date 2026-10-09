import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      index: true,
    },
    counterNumber: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    supportedServiceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    status: {
      type: String,
      enum: ["available", "busy", "paused", "offline"],
      default: "offline",
    },
    pauseReason: String,
    currentTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
    },
    lastActivityAt: Date,
    dailyServedCount: { type: Number, default: 0 },
    estimatedAvailableAt: Date,
  },
  {
    timestamps: true,
  }
);

counterSchema.index({ officeId: 1, status: 1 });

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;
