import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import FcmToken from "../models/citizen/fcmToken.model.js";

let fcmInitialized = false;

// Attempt to initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
    });
    fcmInitialized = true;
    console.log("🔥 Firebase Admin SDK initialized successfully.");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
    fcmInitialized = true;
    console.log("🔥 Firebase Admin SDK initialized from environment variable.");
  } else {
    console.warn(
      "⚠️ Firebase service account credential file (firebase-service-account.json) not found.\n" +
      "⚠️ Push notifications will fall back to MOCK mode."
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
  console.warn("⚠️ Push notifications will fall back to MOCK mode.");
}

/**
 * Sends a push notification to a list of FCM tokens.
 * Falls back to mock logging if FCM is not initialized.
 * 
 * @param {string[]} tokens - Array of FCM registration tokens.
 * @param {object} payload - Notification payload { title, body, data }
 */
export const sendPushNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return;

  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (uniqueTokens.length === 0) return;

  const { title, body, data } = payload;

  if (fcmInitialized) {
    try {
      console.log(`✔ [FCM Server] Creating payload for notification: "${title}"`);
      const message = {
        notification: {
          title,
          body,
        },
        webpush: {
          notification: {
            icon: "/image.jpg",
            badge: "/image.jpg",
            clickAction: "https://polosaranac.netlify.app",
            requireInteraction: true,
            vibrate: [200, 100, 200],
          },
          fcmOptions: {
            link: "https://polosaranac.netlify.app",
          },
        },
        data: data ? Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}) : {},
        tokens: uniqueTokens,
      };
      console.log("✔ [FCM Server] Payload successfully created:", JSON.stringify(message, null, 2));

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`Successfully sent push notification to ${response.successCount} / ${uniqueTokens.length} devices.`);
      
      // If some tokens failed, we can log them (e.g. expired tokens) and delete stale ones from database
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = uniqueTokens[idx];
            const error = resp.error;
            console.warn(`Token: ${token} failed with error: ${error?.message} (code: ${error?.code})`);

            // Check if the error indicates that the token is invalid/expired
            if (
              error?.code === "messaging/invalid-registration-token" ||
              error?.code === "messaging/registration-token-not-registered"
            ) {
              failedTokens.push(token);
            }
          }
        });

        if (failedTokens.length > 0) {
          try {
            const deleteResult = await FcmToken.deleteMany({ token: { $in: failedTokens } });
            console.log(`🧹 Deleted ${deleteResult.deletedCount} stale FCM token(s) from database.`);
          } catch (dbError) {
            console.error("❌ Failed to delete stale FCM tokens from database:", dbError.message);
          }
        }
      }
      return response;
    } catch (error) {
      console.error("❌ Error sending multicast FCM push notification:", error.message);
    }
  } else {
    // MOCK MODE
    console.log(
      `📢 [MOCK FCM PUSH] Sent notification to ${uniqueTokens.length} devices.\n` +
      `📢 Title: "${title}"\n` +
      `📢 Body: "${body}"\n` +
      `📢 Data: ${JSON.stringify(data || {})}`
    );
  }
};
