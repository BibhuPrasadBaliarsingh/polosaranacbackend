import mongoose from "mongoose";

const machineryDefectSchema = new mongoose.Schema(
  {
    supervisorName: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    machineType: {
      type: String,
      required: true,
    },
    image: {
      type: String, // image path
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "repaired", "inprogress"],
      default: "started", // ✅ default
    },
  },
  { timestamps: true },
);

export default mongoose.model("MachineryDefect", machineryDefectSchema);
