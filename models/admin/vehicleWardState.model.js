import mongoose from "mongoose";

const vehicleWardStateSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    currentWard: {
      type: String,
      trim: true,
      default: "",
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastLat: {
      type: Number,
      default: null,
    },
    lastLng: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("VehicleWardState", vehicleWardStateSchema);
