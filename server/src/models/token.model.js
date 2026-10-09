import mongoose from "mongoose";
import crypto from "crypto";

const checkInDataSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["qr", "staff", "auto"] },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    counterId: { type: mongoose.Schema.Types.ObjectId, ref: "Counter" },
  },
  { _id: false }
);

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    tokenNumber: {
      type: String,
      required: true,
      index: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
    queueDate: {
      type: String,  // "2024-01-15" - YYYY-MM-DD
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "issued",
        "checked_in",
        "called",
        "in_service",
        "completed",
        "missed",
        "cancelled",
        "expired",
      ],
      default: "issued",
      index: true,
    },
    source: {
      type: String,
      enum: ["remote", "walk_in", "staff_assisted"],
      default: "remote",
    },
    issuedAt: { type: Date, default: Date.now },
    checkedInAt: Date,
    calledAt: Date,
    serviceStartedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    missedAt: Date,
    assignedCounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Counter",
    },
    estimatedWaitMinutes: Number,
    predictedServiceStart: Date,
    lowerBoundMinutes: Number,
    upperBoundMinutes: Number,
    arrivalDeadline: Date,
    checkInData: checkInDataSchema,

    // Secure QR verification nonce (hashed)
    verificationNonce: {
      type: String,
      unique: true,
      sparse: true,
    },
    verificationNonceHash: {
      type: String,
      select: false,
    },
    nonceUsed: { type: Boolean, default: false },

    // journey/arrival
    citizenTravelMinutes: Number,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Unique active token per citizen+office+service per day
tokenSchema.index(
  { userId: 1, officeId: 1, serviceId: 1, queueDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["issued", "checked_in", "called", "in_service"] },
    },
    name: "unique_active_token",
  }
);

// For queue ordering
tokenSchema.index({ officeId: 1, serviceId: 1, queueDate: 1, sequenceNumber: 1, status: 1 });

tokenSchema.methods.generateVerificationNonce = function () {
  const nonce = crypto.randomBytes(32).toString("hex");
  this.verificationNonce = nonce;
  this.verificationNonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
  return nonce;
};

const Token = mongoose.model("Token", tokenSchema);
export default Token;
