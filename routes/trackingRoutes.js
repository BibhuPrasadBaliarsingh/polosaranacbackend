import express from "express";
import {
  getTrackings,
  getTrails,
  saveTrails,
  clearTrails,
  getRoutesToday,
  getRoutesByDate,
  getRoutesByMonth,
  manualAssignWard,
  simulateVehiclePing,
} from "../controller/admin/vehicle.controller.js";

const router = express.Router();

router.get("/trackings", getTrackings);
router.post("/assign-ward", manualAssignWard);
router.post("/simulate-ping", simulateVehiclePing);
router.get("/trails", getTrails);
router.post("/trails", saveTrails);
router.delete("/trails", clearTrails);


// Route History – systematic 30-day record
router.get("/routes/today", getRoutesToday);
router.get("/routes/date/:date", getRoutesByDate);
router.get("/routes/month", getRoutesByMonth);

export default router;


