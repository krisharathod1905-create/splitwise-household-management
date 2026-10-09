import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const notificationPreferencesSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    tokenIssued: { type: Boolean, default: true },
    queueUpdates: { type: Boolean, default: true },
    tokenCalled: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    googleSubjectId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["citizen", "staff", "admin"],
      default: "citizen",
    },
    phone: {
      type: String,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: ["en", "hi"],
      default: "en",
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    assignedOfficeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Office",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    avatarUrl: String,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 12);
};

const User = mongoose.model("User", userSchema);
export default User;
