import mongoose from "mongoose";
import { isValidPhoneNumber } from "libphonenumber-js";

const CitizenSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (value) {
          // Validate Indian phone numbers
          return isValidPhoneNumber(value, "IN");
        },
        message: "Invalid phone number",
      },
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    wardName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Citizen", CitizenSchema);
