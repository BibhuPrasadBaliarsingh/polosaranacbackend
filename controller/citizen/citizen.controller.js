import jwt from "jsonwebtoken";
import { generateOtp } from "../../utils/otp.util.js";
import Citizen from "../../models/citizen/citizen.model.js";
import OnlineService from "../../models/citizen/onlineService.model.js";
import CitizenNotification from "../../models/citizen/citizenNotification.model.js";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

const normalizePhone = (phone) => {
  if (!isValidPhoneNumber(phone, "IN")) return null;

  const parsed = parsePhoneNumber(phone, "IN");
  const nationalNumber = parsed.nationalNumber;

  if (/^(\d)\1+$/.test(nationalNumber)) return null;
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) return null;

  return parsed.number;
};

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    let citizen = await Citizen.findOne({ phone: normalizedPhone });

    if (!citizen) {
      citizen = await Citizen.create({ phone: normalizedPhone });
    }

    const otp = generateOtp();

    citizen.otp = otp;
    citizen.otpExpiry = Date.now() + 5 * 60 * 1000;
    await citizen.save();

    console.log(`OTP for ${normalizedPhone}: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent successfully",
      otp,
    });
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const citizen = await Citizen.findOne({ phone: normalizedPhone });

    if (
      !citizen ||
      String(citizen.otp) !== String(otp) ||
      citizen.otpExpiry < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    citizen.isVerified = true;
    citizen.otp = null;
    citizen.otpExpiry = null;
    await citizen.save();

    const token = jwt.sign(
      { id: citizen._id, role: "citizen" },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      citizen,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createOnlineService = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      wardNumber,
      buildingNumber,
      houseNumber,
      area,
      colony,
      street,
      pincode,
      serviceType,
      subCategory,
      duration,
      startMonth,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      paymentRemarks,
    } = req.body;

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (!/^\d{6}$/.test(String(pincode || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    const nationalPhone = parsePhoneNumber(normalizedPhone, "IN").nationalNumber;
    const paymentProof = req.file ? req.file.path : null;
    const receiptId = `OS${Date.now().toString().slice(-8)}`;

    const service = await OnlineService.create({
      receiptId,
      fullName,
      phoneNumber: nationalPhone,
      wardNumber,
      buildingNumber,
      houseNumber,
      area,
      colony,
      street,
      pincode,
      serviceType,
      subCategory,
      duration,
      startMonth,
      amount: Number(amount),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionReference,
      paymentDate,
      paymentRemarks,
      paymentProof,
      status: "Pending Verification",
    });

    res.status(201).json({
      success: true,
      message: "Online service payment submitted for verification",
      data: service,
    });
  } catch (err) {
    console.error("Create online service error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to submit online service request",
    });
  }
};

export const getCitizenNotifications = async (req, res) => {
  try {
    const citizenId = req.user?.id || req.user?.userId || req.user?._id;
    if (!citizenId) {
      return res.status(401).json({
        success: false,
        message: "Citizen not authenticated",
      });
    }

    const notifications = await CitizenNotification.find({ citizen: citizenId })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error("Get Citizen Notifications Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const markCitizenNotificationRead = async (req, res) => {
  try {
    const citizenId = req.user?.id || req.user?.userId || req.user?._id;
    const { notificationId } = req.params;

    const notification = await CitizenNotification.findOneAndUpdate(
      { _id: notificationId, citizen: citizenId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Mark Citizen Notification Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

import FcmToken from "../../models/citizen/fcmToken.model.js";

export const updateMyWard = async (req, res) => {
  try {
    const { wardName } = req.body;
    const citizenId = req.user?.id || req.user?.userId || req.user?._id;

    if (!citizenId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!wardName) {
      return res.status(400).json({
        success: false,
        message: "Ward name is required",
      });
    }

    const citizen = await Citizen.findByIdAndUpdate(
      citizenId,
      { wardName: wardName.trim() },
      { new: true, runValidators: true }
    );

    if (!citizen) {
      return res.status(404).json({
        success: false,
        message: "Citizen not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      citizen,
    });
  } catch (err) {
    console.error("Update my ward error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const saveFcmToken = async (req, res) => {
  try {
    const { token, deviceType } = req.body;
    const citizenId = req.user?.id || req.user?.userId || req.user?._id;

    if (!citizenId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM Token is required",
      });
    }

    await FcmToken.findOneAndUpdate(
      { token },
      { citizen: citizenId, deviceType: deviceType || "web" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "FCM Token saved successfully",
    });
  } catch (err) {
    console.error("Save FCM Token error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    const citizenId = req.user?.id || req.user?.userId || req.user?._id;

    if (!citizenId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM Token is required to delete",
      });
    }

    await FcmToken.findOneAndDelete({ token, citizen: citizenId });

    return res.status(200).json({
      success: true,
      message: "FCM Token deleted successfully",
    });
  } catch (err) {
    console.error("Delete FCM Token error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


