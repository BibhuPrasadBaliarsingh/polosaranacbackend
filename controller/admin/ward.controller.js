import Ward from "../../models/admin/ward.model.js";

/**
 * CREATE WARD
 */
export const createWard = async (req, res) => {
  try {
    const { wardName } = req.body;
    
    const escapedWardName = String(wardName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingWard = await Ward.findOne({ wardName: { $regex: `^${escapedWardName}$`, $options: "i" } });
    if (existingWard) {
      return res.status(400).json({ success: false, message: "A ward with this name already exists" });
    }

    const ward = await Ward.create(req.body);

    res.status(201).json({
      success: true,
      message: "Ward created successfully",
      data: ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create ward",
      error: error.message,
    });
  }
};

/**
 * GET ALL WARDS
 */
export const getAllWards = async (req, res) => {
  try {
    const wards = await Ward.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: wards.length,
      data: wards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch wards",
      error: error.message,
    });
  }
};

/**
 * UPDATE WARD
 */
export const updateWard = async (req, res) => {
  try {
    const { id } = req.params;
    const { wardName } = req.body;

    if (wardName) {
      const escapedWardName = String(wardName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingWard = await Ward.findOne({ 
        wardName: { $regex: `^${escapedWardName}$`, $options: "i" },
        _id: { $ne: id }
      });
      if (existingWard) {
        return res.status(400).json({ success: false, message: "A ward with this name already exists" });
      }
    }

    const ward = await Ward.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!ward) {
      return res.status(404).json({ success: false, message: "Ward not found" });
    }

    res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      data: ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update ward",
      error: error.message,
    });
  }
};

/**
 * DELETE WARD
 */
export const deleteWard = async (req, res) => {
  try {
    const { id } = req.params;
    const ward = await Ward.findByIdAndDelete(id);

    if (!ward) {
      return res.status(404).json({ success: false, message: "Ward not found" });
    }

    res.status(200).json({
      success: true,
      message: "Ward deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete ward",
      error: error.message,
    });
  }
};

