import mongoose from "mongoose";

// Atomic sequence counter for token allocation
const queueSequenceSchema = new mongoose.Schema(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    queueDate: { type: String, required: true }, // YYYY-MM-DD
    lastSequence: { type: Number, default: 0 },
    totalIssued: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalCancelled: { type: Number, default: 0 },
    totalMissed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

queueSequenceSchema.index(
  { officeId: 1, serviceId: 1, queueDate: 1 },
  { unique: true }
);

const QueueSequence = mongoose.model("QueueSequence", queueSequenceSchema);
export default QueueSequence;
