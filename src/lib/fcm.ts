/**
 * Hafash — Firebase Cloud Messaging Client Setup
 */

"use client";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  deleteToken,
} from "firebase/messaging";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import {
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

export async function isFCMSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const FCM_SCOPE = "/firebase-cloud-messaging-push-scope";
  let registration = await navigator.serviceWorker.getRegistration(FCM_SCOPE);

  if (!registration) {
    registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: FCM_SCOPE }
    );
  }

  if (registration.active) return registration;

  await new Promise<void>((resolve) => {
    const sw = registration!.installing || registration!.waiting;
    if (!sw) {
      resolve();
      return;
    }
    sw.addEventListener("statechange", () => {
      if (sw.state === "activated") resolve();
    });
  });

  return registration;
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Browser doesn't support notifications");
      return null;
    }

    if (Notification.permission === "denied") {
      console.warn("[FCM] Notification permission denied");
      return null;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[FCM] Permission not granted");
        return null;
      }
    }

    const app =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    const registration = await ensureServiceWorker();
    console.log("[FCM] SW ready:", registration);

    const messaging = getMessaging(app);

    // ✅ Purana/stale token clear karein (agar hai)
    try {
      await deleteToken(messaging);
      console.log("[FCM] Cleared old token");
    } catch {
      // Koi token nahi tha — theek hai
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("[FCM] VAPID key missing from env");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("[FCM] No token received");
      return null;
    }

    console.log("[FCM] Token received successfully");
    return token;
  } catch (err: any) {
    console.error("[FCM] Error getting token:", err);
    return null;
  }
}

export async function saveFCMToken(
  firestore: any,
  userId: string,
  token: string
): Promise<void> {
  if (!firestore || !userId || !token) return;

  try {
    await setDoc(
      doc(firestore, "users", userId),
      {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("[FCM] Token saved to Firestore");
  } catch (err: any) {
    console.error("[FCM] Failed to save token:", err);
  }
}

export async function setupFCM(
  firestore: any,
  userId: string
): Promise<boolean> {
  if (!firestore || !userId) return false;
  const token = await requestNotificationPermission();
  if (!token) return false;
  await saveFCMToken(firestore, userId, token);
  return true;
}

export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  if (typeof window === "undefined") return null;
  try {
    const app =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message received:", payload);
      callback(payload);
    });
    return unsubscribe;
  } catch (err) {
    console.error("[FCM] Foreground listener error:", err);
    return null;
  }
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}