import Complaint from "../../models/citizen/complaint.model.js";
import Citizen from "../../models/citizen/citizen.model.js";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
/**
 * Create a new complaint
 */
export const createComplaint = async (req, res) => {
  try {
    const { description, fullName, phoneNumber, wardNumber, area, category } = req.body;

    const image = req.file ? req.file.path : null;

    // Normalize phone to 10-digit national number to match Complaint model
    const normalizePhone = (phone) => {
      if (!phone) return null;
      try {
        if (!isValidPhoneNumber(phone, "IN")) return null;
        const parsed = parsePhoneNumber(phone, "IN");
        const nationalNumber = parsed.nationalNumber; // e.g., '9876543210'
        if (/^(\d)\1+$/.test(nationalNumber)) return null;
        if (!/^[6-9]\d{9}$/.test(nationalNumber)) return null;
        return nationalNumber;
      } catch (err) {
        return null;
      }
    };

    const normalizedPhone = normalizePhone(phoneNumber) || phoneNumber;

    const complaint = await Complaint.create({
      fullName,
      phoneNumber: normalizedPhone,
      wardNumber,
      area,
      category,
      description,
      image,
    });

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllComplaints = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let complaints = [];

    if (user.role === "admin" || user.role === "supervisor") {
      complaints = await Complaint.find().sort({ createdAt: -1 });
    } else if (user.role === "citizen") {
      const citizenId = user.id || user.userId || user._id;
      if (!citizenId) return res.status(401).json({ success: false, message: "Invalid token payload" });

      const citizen = await Citizen.findById(citizenId);
      if (!citizen) return res.status(404).json({ success: false, message: "Citizen not found" });

      const exactMatch = await Complaint.find({ phoneNumber: citizen.phone }).sort({ createdAt: -1 });
      if (exactMatch && exactMatch.length > 0) {
        complaints = exactMatch;
      } else {
        const digits = (citizen.phone || "").replace(/\D/g, "");
        const last10 = digits.slice(-10);
        if (last10.length === 10) {
          complaints = await Complaint.find({ phoneNumber: { $regex: last10 + "$" } }).sort({ createdAt: -1 });
        } else {
          complaints = [];
        }
      }
    } else {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    console.error("Get complaints error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




/**
 * Admin updates complaint status
 */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatus = ["Pending", "In Progress", "Resolved"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};