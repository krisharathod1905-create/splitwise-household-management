import mongoose from "mongoose";

// Records completed service timings for prediction engine
const serviceHistorySchema = new mongoose.Schema(
  {
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
      index: true,
    },
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
      required: true,
    },
    counterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Counter",
    },
    queueDate: { type: String, required: true },
    serviceStartedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    actualDurationMinutes: { type: Number, required: true },
    waitMinutesActual: Number,
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

serviceHistorySchema.index({ officeId: 1, serviceId: 1, queueDate: -1 });

const ServiceHistory = mongoose.model("ServiceHistory", serviceHistorySchema);
export default ServiceHistory;
