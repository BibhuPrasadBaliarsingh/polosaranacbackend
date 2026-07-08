import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Citizen from "../../models/citizen/citizen.model.js";
import { normalizeWardName } from "../../utils/wardTracking.util.js";

// In-memory admin password (default: admin@123)
let adminPasswordHash = bcrypt.hashSync("admin@123", 10);

// =======================
// ADMIN LOGIN
// =======================
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, adminPasswordHash);

    if (username === "admin" && isPasswordValid) {
      const token = jwt.sign(
        { userId: "admin", role: "admin" },
        process.env.JWT_SECRET || process.env.SECRET_KEY || "secret-key",
        { expiresIn: "7d" },
      );

      res.cookie("jwt-NAC-POLOSARA", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin credentials",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =======================
// CHANGE PASSWORD
// =======================
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const isMatch = bcrypt.compareSync(currentPassword, adminPasswordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    adminPasswordHash = bcrypt.hashSync(newPassword, 10);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =======================
// LOGOUT
// =======================
export const adminLogout = async (req, res) => {
  res.clearCookie("jwt-NAC-POLOSARA");
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// =======================
// GET ALL CITIZEN PHONE NUMBERS (ADMIN ONLY)
// =======================
export const getAllCitizenPhones = async (req, res) => {
  try {
    const citizens = await Citizen.find(
      {}, // Temporarily show all citizens for debugging
      { phone: 1, createdAt: 1, isVerified: 1, wardName: 1 },
    );

    // Add serial number and role to each citizen
    const citizensWithDetails = citizens.map((citizen, index) => ({
      id: citizen._id,
      serialNumber: index + 1,
      phone: citizen.phone,
      wardName: citizen.wardName || "",
      role: "Citizen",
      registeredDate: citizen.createdAt,
      isVerified: citizen.isVerified,
    }));

    return res.status(200).json({
      success: true,
      totalCitizens: citizens.length,
      citizens: citizensWithDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateCitizenWard = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { wardName } = req.body;

    const citizen = await Citizen.findByIdAndUpdate(
      citizenId,
      { wardName: normalizeWardName(wardName || "") },
      { new: true, runValidators: true },
    );

    if (!citizen) {
      return res.status(404).json({
        success: false,
        message: "Citizen not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Citizen ward updated successfully",
      citizen: {
        id: citizen._id,
        phone: citizen.phone,
        wardName: citizen.wardName || "",
        isVerified: citizen.isVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
