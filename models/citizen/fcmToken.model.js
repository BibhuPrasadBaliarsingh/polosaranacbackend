import mongoose from "mongoose";

const fcmTokenSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Citizen",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ["web", "mobile", "other"],
      default: "web",
    },
  },
  { timestamps: true }
);

// Token is uniquely indexed via unique: true above

export default mongoose.model("FcmToken", fcmTokenSchema);
