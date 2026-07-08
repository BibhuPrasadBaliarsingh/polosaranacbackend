import mongoose from "mongoose";

const onlineServiceSchema = new mongoose.Schema(
  {
    receiptId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
    },
    wardNumber: {
      type: String,
      required: true,
      trim: true,
    },
    buildingNumber: {
      type: String,
      trim: true,
      default: "",
    },
    houseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    colony: {
      type: String,
      trim: true,
      default: "",
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Invalid pincode"],
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    startMonth: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: "Bank Transfer",
      trim: true,
    },
    transactionReference: {
      type: String,
      required: true,
      trim: true,
    },
    paymentDate: {
      type: String,
      required: true,
      trim: true,
    },
    paymentRemarks: {
      type: String,
      trim: true,
      default: "",
    },
    paymentProof: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "Pending Verification",
      enum: ["Pending Verification", "Verified", "Rejected"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("OnlineService", onlineServiceSchema);
