import axios from "axios";
import Citizen from "../../models/citizen/citizen.model.js";
import CitizenNotification from "../../models/citizen/citizenNotification.model.js";
import VehicleWardState from "../../models/admin/vehicleWardState.model.js";
import VehicleTrail from "../../models/admin/vehicleTrail.model.js";
import RouteHistory from "../../models/admin/routeHistory.model.js";
import FcmToken from "../../models/citizen/fcmToken.model.js";
import Ward from "../../models/admin/ward.model.js";
import { sendPushNotification } from "../../utils/fcm.util.js";
import { getTrackingWardName } from "../../utils/wardTracking.util.js";

const NOTIFICATION_DEDUP_WINDOW_MS = 30 * 60 * 1000;
const CACHE_DURATION = 2 * 60 * 1000;
const TRAIL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let lastFetchTime = 0;
let cachedTrackingData = null;

const isValidTrailPoint = (point) =>
  point && typeof point === "object" &&
  Number.isFinite(Number(point.lat)) &&
  Number.isFinite(Number(point.lng)) &&
  Number.isFinite(Number(point.timestamp));

const normalizeTrailPoints = (trail) =>
  Array.isArray(trail)
    ? trail
        .map((point) => ({
          lat: Number(point.lat),
          lng: Number(point.lng),
          timestamp: Number(point.timestamp),
        }))
        .filter(isValidTrailPoint)
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];

const trimTrailPoints = (trail, now = Date.now()) =>
  normalizeTrailPoints(trail).filter(
    (point) => now - point.timestamp <= TRAIL_RETENTION_MS,
  );

export const getTrails = async (req, res) => {
  try {
    const trails = await VehicleTrail.find({});
    const data = trails.reduce((acc, doc) => {
      acc[doc.vehicleId] = doc.trail || [];
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "Vehicle trails loaded successfully",
      data,
    });
  } catch (error) {
    console.error("GetTrails error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to load vehicle trails",
      error: error?.message || String(error),
    });
  }
};

export const saveTrails = async (req, res) => {
  try {
    const { trails } = req.body;
    if (!trails || typeof trails !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid trails payload",
      });
    }

    const now = Date.now();
    const routeHistoryDocs = [];

    const updatePromises = Object.entries(trails)
      .map(([vehicleId, trail]) => {
        const normalizedTrail = trimTrailPoints(trail, now);
        if (normalizedTrail.length === 0) {
          return null;
        }

        // Collect new points for RouteHistory (systematic 30-day record)
        normalizedTrail.forEach((point) => {
          routeHistoryDocs.push({
            vehicleId,
            latitude: point.lat,
            longitude: point.lng,
            recordedAt: new Date(point.timestamp),
          });
        });

        return VehicleTrail.findOneAndUpdate(
          { vehicleId },
          {
            vehicleId,
            trail: normalizedTrail,
            updatedAt: new Date(),
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );
      })
      .filter(Boolean);

    await Promise.all(updatePromises);

    // Persist route history in bulk (ignore duplicates via ordered:false)
    if (routeHistoryDocs.length > 0) {
      try {
        await RouteHistory.insertMany(routeHistoryDocs, {
          ordered: false,
          lean: true,
        });
      } catch (histErr) {
        // Ignore duplicate-key errors from concurrent saves
        if (histErr.code !== 11000) {
          console.warn("RouteHistory insert warn:", histErr?.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Vehicle trails saved",
    });
  } catch (error) {
    console.error("SaveTrails error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to save vehicle trails",
      error: error?.message || String(error),
    });
  }
};

export const clearTrails = async (req, res) => {
  try {
    await VehicleTrail.deleteMany({});
    res.status(200).json({
      success: true,
      message: "Vehicle trails cleared successfully",
    });
  } catch (error) {
    console.error("ClearTrails error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to clear vehicle trails",
      error: error?.message || String(error),
    });
  }
};


// ===========================================================
// ROUTE HISTORY – 3 query endpoints
// ===========================================================

/**
 * GET /tracking/routes/today
 * Returns all GPS points recorded today for all vehicles.
 */
export const getRoutesToday = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await RouteHistory.find({
      recordedAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ vehicleId: 1, recordedAt: 1 });

    // Group by vehicleId for frontend convenience
    const grouped = records.reduce((acc, r) => {
      if (!acc[r.vehicleId]) {
        acc[r.vehicleId] = {
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber || r.vehicleId,
          points: [],
        };
      }
      acc[r.vehicleId].points.push({
        lat: r.latitude,
        lng: r.longitude,
        speed: r.speed,
        ward: r.ward,
        recordedAt: r.recordedAt,
      });
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      routes: Object.values(grouped),
    });
  } catch (error) {
    console.error("GetRoutesToday error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to load today's routes",
      error: error?.message || String(error),
    });
  }
};

/**
 * GET /tracking/routes/date/:date  (format: YYYY-MM-DD)
 * Returns GPS points for all vehicles on a specific date.
 */
export const getRoutesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    // Use local midnight for IST (+5:30) awareness
    const localStart = new Date(date);
    localStart.setHours(0, 0, 0, 0);
    const localEnd = new Date(date);
    localEnd.setHours(23, 59, 59, 999);

    const records = await RouteHistory.find({
      recordedAt: { $gte: localStart, $lte: localEnd },
    }).sort({ vehicleId: 1, recordedAt: 1 });

    const grouped = records.reduce((acc, r) => {
      if (!acc[r.vehicleId]) {
        acc[r.vehicleId] = {
          vehicleId: r.vehicleId,
          registrationNumber: r.registrationNumber || r.vehicleId,
          points: [],
        };
      }
      acc[r.vehicleId].points.push({
        lat: r.latitude,
        lng: r.longitude,
        speed: r.speed,
        ward: r.ward,
        recordedAt: r.recordedAt,
      });
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      date,
      routes: Object.values(grouped),
    });
  } catch (error) {
    console.error("GetRoutesByDate error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to load routes for the specified date",
      error: error?.message || String(error),
    });
  }
};

/**
 * GET /tracking/routes/month  (query param: ?month=YYYY-MM)
 * Returns a day-by-day summary (point counts) for the current month
 * or a specified month.
 */
export const getRoutesByMonth = async (req, res) => {
  try {
    const monthParam = req.query.month; // e.g. "2025-07"
    let year, month;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      [year, month] = monthParam.split("-").map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1; // 1-indexed
    }

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await RouteHistory.find({
      recordedAt: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ recordedAt: 1 });

    // Build day -> vehicle -> count summary
    const summary = {};
    records.forEach((r) => {
      const day = r.recordedAt.toISOString().split("T")[0];
      if (!summary[day]) summary[day] = {};
      summary[day][r.vehicleId] = (summary[day][r.vehicleId] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      month: `${year}-${String(month).padStart(2, "0")}`,
      summary, // { "2025-07-01": { "IMEI_123": 42, ... }, ... }
      totalPoints: records.length,
    });
  } catch (error) {
    console.error("GetRoutesByMonth error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to load monthly route summary",
      error: error?.message || String(error),
    });
  }
};

const processWardEntryNotifications = async (trackingList = []) => {
  for (const item of trackingList) {
    const vehicleNumber = String(
      item.truck_number || item.truck_no || item.registrationNumber || "",
    ).trim();

    if (!vehicleNumber) continue;

    const currentWard = getTrackingWardName(item);
    if (!currentWard) continue;

    const state = await VehicleWardState.findOne({ vehicleNumber });
    const previousWard = state?.currentWard || "";

    const lastSeenAt = item.device_timestamp
      ? new Date(item.device_timestamp)
      : new Date();
    const entryAt = Number.isNaN(lastSeenAt.getTime())
      ? new Date()
      : lastSeenAt;

    await VehicleWardState.findOneAndUpdate(
      { vehicleNumber },
      {
        currentWard,
        lastSeenAt: entryAt,
        lastLat: Number(item.lat),
        lastLng: Number(item.lng),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (previousWard === currentWard) continue;

    const citizens = await Citizen.find({
      isVerified: true,
      wardName: currentWard,
    });

    if (!citizens.length) continue;

    const citizensToNotify = [];

    for (const citizen of citizens) {
      const existing = await CitizenNotification.findOne({
        citizen: citizen._id,
        vehicleNumber,
        wardName: currentWard,
        entryAt: {
          $gte: new Date(entryAt.getTime() - NOTIFICATION_DEDUP_WINDOW_MS),
        },
      });

      if (existing) continue;

      await CitizenNotification.create({
        citizen: citizen._id,
        phone: citizen.phone,
        wardName: currentWard,
        vehicleNumber,
        title: "Vehicle entered your ward",
        message: `${vehicleNumber} has entered ${currentWard}.`,
        entryAt,
      });

      citizensToNotify.push(citizen._id);
    }

    if (citizensToNotify.length > 0) {
      try {
        const tokensDoc = await FcmToken.find({
          citizen: { $in: citizensToNotify },
        });
        const tokens = tokensDoc.map((t) => t.token);

        if (tokens.length > 0) {
          await sendPushNotification(tokens, {
            title: "Vehicle Entered Ward",
            body: `${vehicleNumber} has entered ${currentWard}.`,
            data: {
              wardName: currentWard,
              vehicleNumber,
              type: "ward_entry",
            },
          });
        }
      } catch (pushErr) {
        console.error("FCM dispatch error in processWardEntryNotifications:", pushErr.message);
      }
    }
  }
};

export const getTrackings = async (req, res) => {
  try {
    const loginPayload = {
      username: process.env.BLACKBUCK_USERNAME,
      password: process.env.BLACKBUCK_PASSWORD,
      login_type: "USERNAME",
      tenant: "GPS_SHIPPER",
      client_name: "GPS_FLEET_PORTAL",
    };

    // Step 1: Login
    const loginResponse = await axios.post(
      "https://partner-api.blackbuck.com/authentication/v1/login",
      loginPayload,
      {
        headers: {
          "content-type": "application/json",
          "x-aaa-enabled": "true",
        },
      },
    );

    const token = loginResponse?.data?.access_token;
    const tenantIdentifier =
      loginResponse?.data?.tenant_identifier || "7982061";
    const tenantType = loginResponse?.data?.tenant_type || "GPS_SHIPPER";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Blackbuck token not received",
      });
    }

    // Step 2: Fetch tracking data
    const trackingResponse = await axios.get(
      "https://api-fms.blackbuck.com/fmsiot/api/shipper/v2/tracking/list?page_number=0&page_size=50",
      {
        headers: {
          authorization: `Token ${token}`,
          "content-type": "application/json",
          "x-aaa-enabled": "true",
          "x-tenant-identifier": tenantIdentifier,
          "x-tenant-type": tenantType,
        },
      },
    );

    const allData = trackingResponse.data;

    const filteredList = (allData.list || []).filter(
      (item) =>
        item.truck_no !== "OD07Z8706" &&
        item.truck_no !== "OD07Z8705" &&
        item.truck_number !== "OD07Z8706" &&
        item.truck_number !== "OD07Z8705",
    );

    await processWardEntryNotifications(filteredList);

    // Fetch our own DB states to inject currentWard if needed
    const states = await VehicleWardState.find({});
    const stateMap = states.reduce((acc, s) => {
      acc[s.vehicleNumber] = s;
      return acc;
    }, {});

    const enrichedList = filteredList.map(item => {
      const vNum = String(item.truck_number || item.truck_no).trim();
      const dbState = stateMap[vNum];
      return {
        ...item,
        currentWard: dbState ? dbState.currentWard : getTrackingWardName(item)
      };
    });

    res.status(200).json({
      success: true,
      message: "Tracking data fetched successfully",
      data: {
        ...allData,
        list: enrichedList,
        total_count: enrichedList.length,
      },
    });
  } catch (error) {
    console.error(
      "Blackbuck tracking error:",
      error?.response?.data || error.message,
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking data from Blackbuck",
      error: error?.response?.data || error.message,
    });
  }
};



// Haversine distance in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const simulateVehiclePing = async (req, res) => {
  try {
    const { vehicleNumber, lat, lng } = req.body;
    if (!vehicleNumber || !lat || !lng) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const wards = await Ward.find({});
    let enteredWard = "";

    for (const ward of wards) {
      if (ward.centerLat && ward.centerLng && ward.radius) {
        const dist = getDistance(lat, lng, ward.centerLat, ward.centerLng);
        if (dist <= ward.radius) {
          enteredWard = ward.wardName;
          break; // First match wins
        }
      }
    }

    // Process notification
    await processWardEntryNotifications([{
      truck_no: vehicleNumber,
      lat,
      lng,
      device_timestamp: new Date().toISOString(),
      address: enteredWard
    }]);

    // Force update VehicleWardState even if it didn't enter a ward (so it moves on map)
    const state = await VehicleWardState.findOneAndUpdate(
      { vehicleNumber },
      {
        lastLat: lat,
        lastLng: lng,
        lastSeenAt: new Date(),
        ...(enteredWard ? { currentWard: enteredWard } : {})
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: "Simulated ping successful", data: state });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
};

export const manualAssignWard = async (req, res) => {
  try {
    const { vehicleNumber, wardName } = req.body;
    if (!vehicleNumber || !wardName) {
      return res.status(400).json({ success: false, message: "vehicleNumber and wardName are required" });
    }

    const state = await VehicleWardState.findOneAndUpdate(
      { vehicleNumber },
      {
        currentWard: wardName,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send notifications to citizens of this ward
    const citizens = await Citizen.find({
      isVerified: true,
      wardName: wardName,
    });

    if (citizens.length > 0) {
      const citizensToNotify = [];
      const now = new Date();

      for (const citizen of citizens) {
        await CitizenNotification.create({
          citizen: citizen._id,
          phone: citizen.phone,
          wardName: wardName,
          vehicleNumber,
          title: "Vehicle entered your ward",
          message: `${vehicleNumber} has entered ${wardName}.`,
          entryAt: now,
        });

        citizensToNotify.push(citizen._id);
      }

      if (citizensToNotify.length > 0) {
        try {
          const tokensDoc = await FcmToken.find({
            citizen: { $in: citizensToNotify },
          });
          const tokens = tokensDoc.map((t) => t.token);

          if (tokens.length > 0) {
            await sendPushNotification(tokens, {
              title: "Vehicle Entered Ward",
              body: `${vehicleNumber} has entered ${wardName}.`,
              data: {
                wardName: wardName,
                vehicleNumber,
                type: "ward_entry",
              },
            });
          }
        } catch (pushErr) {
          console.error("FCM dispatch error in manualAssignWard:", pushErr.message);
        }
      }
    }

    // Clear cache to reflect new ward immediately
    cachedTrackingData = null;

    res.status(200).json({
      success: true,
      message: "Ward assigned successfully",
      data: state,
    });
  } catch (error) {
    console.error("Manual assign ward error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign ward",
      error: error.message || String(error),
    });
  }
};