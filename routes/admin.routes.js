import express from "express";
import {
  adminLogin,
  adminLogout,
  changeAdminPassword,
  getAllCitizenPhones,
  updateCitizenWard,
} from "../controller/admin/admin.controller.js";
import isAuthenticated from "../middleware/authMiddleware.js";

const router = express.Router();


// =======================
// AUTH ROUTES
// =======================

router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.post("/change-password", isAuthenticated, changeAdminPassword);



// =======================
// CITIZEN DATA (ADMIN ONLY)
// =======================
router.get("/citizens", getAllCitizenPhones);
router.put("/citizens/:citizenId/ward", updateCitizenWard);


export default router;
