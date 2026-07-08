import express from "express";
import { getContactProfile, upsertContactProfile } from "../controller/admin/contactProfile.controller.js";


const router = express.Router();

// Admin only
router.get("/contact-get",  getContactProfile);
router.put("/update-profile",  upsertContactProfile);

export default router;
