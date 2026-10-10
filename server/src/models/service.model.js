import mongoose from "mongoose";

const documentRequirementSchema = new mongoose.Schema(
  {
    requirementId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    instructions: { type: String, trim: true, maxlength: 500 },
    required: { type: Boolean, default: true },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    serviceCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    expectedDurationMinutes: { type: Number, default: 10, min: 1 },
    requiredDocuments: [{ type: String }],
    documentRequirements: { type: [documentRequirementSchema], default: [] },
    enabled: { type: Boolean, default: true },
    compatibleCounterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Counter",
      },
    ],
    dailyCapacity: { type: Number, default: 100 },
    category: {
      type: String,
      enum: [
        "passport",
        "driving_license",
        "vehicle_registration",
        "birth_certificate",
        "death_certificate",
        "land_records",
        "municipal",
        "general",
      ],
      default: "general",
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ officeId: 1, serviceCode: 1 }, { unique: true });
serviceSchema.index({ officeId: 1, enabled: 1 });

const Service = mongoose.model("Service", serviceSchema);
export default Service;
