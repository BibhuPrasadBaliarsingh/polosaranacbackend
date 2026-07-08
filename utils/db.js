import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in .env");
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("database connected successfully");

    // Drop legacy index to prevent E11000 duplicate key errors
    try {
      const db = conn.connection.db;
      await db.collection("vehiclewardstates").dropIndex("truckNo_1");
      console.log("Dropped legacy index truckNo_1 from vehiclewardstates collection");
    } catch (indexErr) {
      // Suppress error if the index does not exist
    }
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;

