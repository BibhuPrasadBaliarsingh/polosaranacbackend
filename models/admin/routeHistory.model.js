import mongoose from "mongoose";

/**
 * RouteHistory – stores individual GPS snapshots for each vehicle.
 * One document per GPS update; queried by vehicleId + date range.
 * Retained for at least 1 month per project requirement.
 */
const routeHistorySchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
      default: null,
    },
    ward: {
      type: String,
      trim: true,
      default: "",
    },
    recordedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: false },
);

// Compound index for efficient per-vehicle date range queries
routeHistorySchema.index({ vehicleId: 1, recordedAt: -1 });

// TTL index – auto-expire documents after 30 days (2592000 seconds)
routeHistorySchema.index(
  { recordedAt: 1 },
  { expireAfterSeconds: 2592000 },
);

export default mongoose.model("RouteHistory", routeHistorySchema);
