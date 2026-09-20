'use server';
import { getSubscriptionInfo } from '@/lib/subscription/status';

import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats } from '@/lib/storage/stats';

/**
 * SERVER ACTION: Request a signed URL for direct-to-R2 upload.
 * ✅ Owner bypass: Firebase Auth se email fetch karke owner check karta hai
 */
export async function requestUploadUrl({
  userId,
  galleryId,
  fileName,
  contentType,
  fileSize,
}: {
  userId: string;
  galleryId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  console.log(`[DEBUG] requestUploadUrl start: ${fileName} (${fileSize} bytes)`);

  if (!adminDb) {
    return { 
      success: false, 
      error: "Database infrastructure offline. Please configure Firebase Admin credentials or ensure you are in a supported cloud environment." 
    };
  }

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: "User profile not found." };
    }

    const rawData = userSnap.data() || {};

    // ✅ Firebase Auth se email fetch karo (owner check ke liye)
    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
      console.log(`[AUTH_EMAIL] Fetched: ${authEmail}`);
    } catch (e: any) {
      console.warn("[AUTH_EMAIL] Failed:", e.message);
    }

    // ✅ userData build karo — email + subscriptionStatus fallback
    const subscriptionStatus = rawData.subscriptionStatus || (
      rawData.subscriptionNextRenewal && new Date(rawData.subscriptionNextRenewal) > new Date()
        ? 'active'
        : rawData.subscriptionStatus
    );

    const userData = {
      ...rawData,
      email: rawData.email || authEmail,
      userEmail: rawData.userEmail || authEmail,
      photographerEmail: rawData.photographerEmail || authEmail,
      subscriptionStatus,
    };

    const subscription = getSubscriptionInfo(userData);
    console.log(`[DEBUG] Subscription state: ${subscription.state} | Plan: ${subscription.planName}`);

    if (subscription.state !== "active") {
      return {
        success: false,
        error: subscription.state === "grace"
          ? "Your subscription has expired. Please renew your plan to continue uploading."
          : "Your subscription is inactive. Please complete payment to activate your storage plan."
      };
    }

    const stats = await getStorageStats(userId);
    const incomingSizeGb = fileSize / (1024 * 1024 * 1024);
    
    if ((stats.usedGb + incomingSizeGb) > stats.totalGb) {
      return { 
        success: false, 
        error: `Storage quota exceeded. Your ${stats.planName} plan limit is ${stats.totalGb}GB.` 
      };
    }

    const fileId = crypto.randomUUID();
    const extension = fileName.split('.').pop();
    const key = `uploads/${userId}/${galleryId}/${fileId}.${extension}`;

    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    console.log(`[DEBUG] Signed URL generated for path: ${key}`);
    return { success: true, uploadUrl, key };

  } catch (error: any) {
    console.error("[DEBUG] Upload authorization failure:", error);
    return { success: false, error: error.message || "An internal error occurred during storage handshake." };
  }
}

/**
 * SERVER ACTION: Finalize an upload by verifying storage and updating metadata.
 * Supports: thumbnail + preview + original (locked, paid download only)
 */
export async function completeUpload({
  userId,
  galleryId,
  task,
}: {
  userId: string;
  galleryId: string;
  task: { 
    id: string; 
    key: string; 
    thumbKey?: string;
    originalKey?: string | null;
    originalReady?: boolean;
    file: { name: string; size: number; type: string } 
  };
}) {
  console.log(`[DEBUG] completeUpload: ${task.file.name} (original: ${task.originalReady})`);

  if (!adminDb || !admin) {
    return { success: false, error: "Database offline. Metadata synchronization failed." };
  }

  try {
    const exists = await storage.fileExists(task.key);
    if (!exists) {
      return { success: false, error: "Asset missing from storage. Handshake failed." };
    }

    // Preview URL (7 days)
    const assetUrl = await storage.getSignedUrl(task.key, 604800);

    // Thumbnail URL (7 days)
    let thumbUrl = assetUrl;
    if (task.thumbKey) {
      try {
        const thumbExists = await storage.fileExists(task.thumbKey);
        if (thumbExists) {
          thumbUrl = await storage.getSignedUrl(task.thumbKey, 604800);
          console.log(`[DEBUG] Thumbnail URL generated: ${task.thumbKey}`);
        }
      } catch (e: any) {
        console.warn(`[DEBUG] Thumbnail URL failed:`, e.message);
      }
    }

    // Original URL (short-lived 15 min — sirf payment ke baad fresh milta hai)
    let originalUrl = null;
    if (task.originalKey && task.originalReady) {
      try {
        const originalExists = await storage.fileExists(task.originalKey);
        if (originalExists) {
          originalUrl = await storage.getSignedUrl(task.originalKey, 900);
          console.log(`[DEBUG] Original URL generated: ${task.originalKey}`);
        }
      } catch (e: any) {
        console.warn(`[DEBUG] Original URL failed:`, e.message);
      }
    }

    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const gallerySnap = await galleryRef.get();
    const existingItems = gallerySnap.data()?.items || [];
    const existingIndex = existingItems.findIndex((it: any) => it.id === task.id);

    if (existingIndex >= 0 && task.originalReady) {
      // ✅ UPDATE: Original ready — existing preview item mein original add karo
      const updatedItems = [...existingItems];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        originalKey: task.originalKey,
        originalUrl: originalUrl,
        originalReady: true,
        originalSize: task.file.size,
        originalUpdatedAt: new Date().toISOString(),
      };

      await galleryRef.update({
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });

      console.log(`[DEBUG] ✅ Original linked for ${task.file.name}`);
    } else if (existingIndex < 0) {
      // ✅ NEW: Preview upload — naya item add karo
      const newAsset = {
        id: task.id,
        url: assetUrl,
        masterUrl: assetUrl,
        thumbUrl: thumbUrl,
        thumbKey: task.thumbKey || null,
        storageKey: task.key,
        previewKey: task.key,
        originalKey: task.originalKey || null,
        originalUrl: originalUrl,
        originalReady: task.originalReady || false,
        fileName: task.file.name,
        fileSize: task.file.size,
        contentType: task.file.type,
        isFavorite: false,
        uploadedAt: new Date().toISOString(),
      };

      await galleryRef.update({
        items: admin.firestore.FieldValue.arrayUnion(newAsset),
        updatedAt: new Date().toISOString()
      });

      console.log(`[DEBUG] ✅ Preview added for ${task.file.name}`);
    } else {
      console.log(`[DEBUG] Skipped (no changes) for ${task.file.name}`);
    }

    return { success: true };

  } catch (error: any) {
    console.error("[DEBUG] Sync failure:", error);
    return { success: false, error: error.message || "Metadata synchronization failed." };
  }
}

/**
 * SERVER ACTION: Bulk delete R2 objects.
 */
export async function deleteGalleryFiles(storageKeys: string[]) {
  try {
    if (!storageKeys || storageKeys.length === 0) {
      return { success: true };
    }

    console.log(`[SERVER_DELETE] START: Requesting purge for ${storageKeys.length} assets`);

    const results = await Promise.allSettled(
      storageKeys.map(async key => {
        if (!key) return;
        try {
          const deletePromise = storage.deleteFile(key);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
          await Promise.race([deletePromise, timeoutPromise]);
        } catch (e: any) {
          console.error(`[SERVER_DELETE] Failed to purge key: ${key}`, e.message);
          throw e;
        }
      })
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[SERVER_DELETE] PARTIAL_FAILURE: ${failures.length} assets failed.`);
    } else {
      console.log(`[SERVER_DELETE] SUCCESS: All assets purged.`);
    }

    return { 
      success: failures.length === 0, 
      error: failures.length > 0 ? `${failures.length} assets could not be removed from cloud storage.` : undefined 
    };
  } catch (error: any) {
    console.error("[SERVER_DELETE] CRITICAL_ERROR:", error);
    return {
      success: false,
      error: error.message || "Cloud storage handshake failed.",
    };
  }
}

/**
 * SERVER ACTION: Generate a signed URL for a music file (7 days max).
 */
export async function getMusicSignedUrl(key: string) {
  try {
    if (!key) {
      return { success: false, error: "Missing storage key" };
    }
    const url = await storage.getSignedUrl(key, 604800);
    return { success: true, url };
  } catch (error: any) {
    console.error("[MUSIC_URL] Error:", error);
    return { success: false, error: error.message || "Failed to generate music URL" };
  }
}

/**
 * SERVER ACTION: Get a fresh signed URL for a music file by storage key.
 */
export async function getFreshMusicUrl(storageKey: string) {
  try {
    if (!storageKey) {
      return { success: false, error: "Missing key" };
    }
    const url = await storage.getSignedUrl(storageKey, 604800);
    return { success: true, url };
  } catch (error: any) {
    console.error("[FRESH_MUSIC_URL] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * SERVER ACTION: Get fresh download URL for ORIGINAL photo.
 * Short-lived (15 min) — sirf download ke waqt generate hota hai.
 */
export async function getOriginalDownloadUrl(originalKey: string) {
  try {
    if (!originalKey) {
      return { success: false, error: "Missing original key" };
    }

    const exists = await storage.fileExists(originalKey);
    if (!exists) {
      return { success: false, error: "Original file not found" };
    }

    const url = await storage.getSignedUrl(originalKey, 900);
    return { success: true, url };
  } catch (error: any) {
    console.error("[ORIGINAL_DOWNLOAD] Error:", error);
    return { success: false, error: error.message };
  }
}