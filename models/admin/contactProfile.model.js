import mongoose from "mongoose";

const contactProfileSchema = new mongoose.Schema(
  {
    contactLevel: {
      type: String,
      enum: ["ULB", "State", "District"],
      required: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    officialMobile: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/, // Indian mobile validation
    },

    officialEmail: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

export default mongoose.model("ContactProfile", contactProfileSchema);
