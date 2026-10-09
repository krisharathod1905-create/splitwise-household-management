import mongoose from "mongoose";

const workingHoursSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
    open: String,   // "09:00"
    close: String,  // "17:00"
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: String,
    area: String,
    city: { type: String, required: true },
    state: String,
    pincode: String,
    landmark: String,
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    phone: String,
    email: String,
    website: String,
  },
  { _id: false }
);

const operationalSettingsSchema = new mongoose.Schema(
  {
    maxDailyTokens: { type: Number, default: 500 },
    checkInBufferMinutes: { type: Number, default: 15 },
    gracePeriodMinutes: { type: Number, default: 10 },
    allowWalkIn: { type: Boolean, default: true },
    tokenBookingLeadMinutes: { type: Number, default: 5 },
  },
  { _id: false }
);

const officeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    officeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: { type: addressSchema, required: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    contact: contactSchema,
    workingHours: [workingHoursSchema],
    holidays: [
      {
        date: String,  // "2024-01-26"
        reason: String,
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "temporarily_closed"],
      default: "active",
    },
    operationalSettings: {
      type: operationalSettingsSchema,
      default: () => ({}),
    },
    imageUrl: String,
    description: String,
    accessibilityInfo: String,
  },
  {
    timestamps: true,
  }
);

officeSchema.index({ "address.city": 1, department: 1 });
officeSchema.index({ status: 1 });

const Office = mongoose.model("Office", officeSchema);
export default Office;
