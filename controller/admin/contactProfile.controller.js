import ContactProfile from "../../models/admin/contactProfile.model.js";

/**
 * GET profile (for edit page load)
 */
export const getContactProfile = async (req, res) => {
  try {
    const profile = await ContactProfile.findOne();
    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * CREATE or UPDATE profile (Admin)
 */
export const upsertContactProfile = async (req, res) => {
  try {


    const {
      contactLevel,
      state,
      district,
      city,
      designation,
      name,
      officialMobile,
      officialEmail,
      address,
    } = req.body;

    // basic validation
    if (
      !contactLevel ||
      !state ||
      !district ||
      !city ||
      !designation ||
      !name ||
      !officialMobile ||
      !officialEmail ||
      !address
    ) {
      console.log("Validation failed: missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    let profile = await ContactProfile.findOne();

    if (profile) {
      // update
      profile.contactLevel = contactLevel;
      profile.state = state;
      profile.district = district;
      profile.city = city;
      profile.designation = designation;
      profile.name = name;
      profile.officialMobile = officialMobile;
      profile.officialEmail = officialEmail;
      profile.address = address;
      if (req.id) {
        profile.updatedBy = req.id;
      }

      await profile.save();
    } else {
      // create
      const createData = {
        contactLevel,
        state,
        district,
        city,
        designation,
        name,
        officialMobile,
        officialEmail,
        address,
      };
      if (req.id) {
        createData.updatedBy = req.id;
      }
      profile = await ContactProfile.create(createData);
    }

    return res.status(200).json({
      message: "Contact profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Error updating contact profile:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};
