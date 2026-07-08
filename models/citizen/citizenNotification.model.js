import mongoose from "mongoose";

const citizenNotificationSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Citizen",
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    wardName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entryAt: {
      type: Date,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

citizenNotificationSchema.index({
  citizen: 1,
  vehicleNumber: 1,
  wardName: 1,
  entryAt: -1,
});

export default mongoose.model(
  "CitizenNotification",
  citizenNotificationSchema,
);
