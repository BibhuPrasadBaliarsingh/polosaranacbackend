import mongoose from "mongoose";

const vehicleTrailPointSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const vehicleTrailSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    trail: {
      type: [vehicleTrailPointSchema],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model("VehicleTrail", vehicleTrailSchema);
