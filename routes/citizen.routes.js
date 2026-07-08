import express from "express";

import upload from "../utils/multer.js";
import isAuthenticated from "../middleware/authMiddleware.js";
import {
  sendOtp,
  verifyOtp,
  createOnlineService,
  getCitizenNotifications,
  markCitizenNotificationRead,
  updateMyWard,
  saveFcmToken,
  deleteFcmToken,
} from "../controller/citizen/citizen.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/online-services", upload.single("paymentProof"), createOnlineService);
router.get("/notifications", isAuthenticated, getCitizenNotifications);
router.patch(
  "/notifications/:notificationId/read",
  isAuthenticated,
  markCitizenNotificationRead,
);
router.put("/update-ward", isAuthenticated, updateMyWard);
router.post("/fcm-token", isAuthenticated, saveFcmToken);
router.delete("/fcm-token", isAuthenticated, deleteFcmToken);



export default router;
