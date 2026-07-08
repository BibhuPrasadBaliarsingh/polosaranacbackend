import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    wardName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: Number,
      required: true,
    },
    population: {
      type: Number,
      required: true,
    },
    household: {
      type: Number,
      required: true,
    },
    wasteGenerationPerDay: {
      type: Number,
      required: true,
    },
    collectionFrequency: {
      type: String,
      enum: ["Daily", "Alternate Day", "Weekly"],
      required: true,
    },
    supervisorName: {
      type: String,
      required: true,
    },
    supervisorPhone: {
      type: Number,
      required: true,
    },
    centerLat: {
      type: Number,
      required: true,
      default: 19.7, // fallback
    },
    centerLng: {
      type: Number,
      required: true,
      default: 84.8, // fallback
    },
    radius: {
      type: Number,
      required: true,
      default: 500, // meters
    },
  },
  { timestamps: true },
);

export default mongoose.model("Ward", wardSchema);
