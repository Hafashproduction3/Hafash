'use server';
import { getSubscriptionInfo } from '@/lib/subscription/status';
import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats } from '@/lib/storage/stats';

/**
 * Request a signed URL for direct-to-R2 upload.
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
    return { success: false, error: "Database infrastructure offline." };
  }

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: "User profile not found." };
    }

    const rawData = userSnap.data() || {};

    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
    } catch (e: any) {
      console.warn("[AUTH_EMAIL] Failed:", e.message);
    }

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
    console.log(`[DEBUG] Subscription: ${subscription.state} | ${subscription.planName}`);

    if (subscription.state !== "active") {
      return {
        success: false,
        error: subscription.state === "grace"
          ? "Your subscription has expired. Please renew your plan."
          : "Your subscription is inactive. Please complete payment."
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

    console.log(`[DEBUG] Signed URL generated: ${key}`);
    return { success: true, uploadUrl, key };

  } catch (error: any) {
    console.error("[DEBUG] Upload auth failure:", error);
    return { success: false, error: error.message || "Internal error." };
  }
}

/**
 * Finalize an upload — SUBCOLLECTION VERSION
 * Photos saved to galleries/{id}/photos/{photoId}
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
    return { success: false, error: "Database offline." };
  }

  try {
    const exists = await storage.fileExists(task.key);
    if (!exists) {
      return { success: false, error: "Asset missing from storage." };
    }

    // Preview URL (7 days)
    const assetUrl = await storage.getSignedUrl(task.key, 604800);

    // Thumbnail URL
    let thumbUrl = assetUrl;
    if (task.thumbKey) {
      try {
        if (await storage.fileExists(task.thumbKey)) {
          thumbUrl = await storage.getSignedUrl(task.thumbKey, 604800);
        }
      } catch (e) {}
    }

    // Original URL
    let originalUrl = null;
    if (task.originalKey && task.originalReady) {
      try {
        if (await storage.fileExists(task.originalKey)) {
          originalUrl = await storage.getSignedUrl(task.originalKey, 900);
        }
      } catch (e) {}
    }

    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const photosRef = galleryRef.collection('photos');
    const photoDocRef = photosRef.doc(task.id);

    // Check if photo already exists in subcollection
    const photoSnap = await photoDocRef.get();

    if (photoSnap.exists && task.originalReady) {
      // ✅ UPDATE: Original ready — existing preview doc mein original add karo
      await photoDocRef.update({
        originalKey: task.originalKey,
        originalUrl: originalUrl,
        originalReady: true,
        originalSize: task.file.size,
        originalUpdatedAt: new Date().toISOString(),
      });
      console.log(`[DEBUG] ✅ Original linked: ${task.file.name}`);
    } else if (!photoSnap.exists) {
      // ✅ NEW: Photo add karo subcollection mein
      await photoDocRef.set({
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
        order: Date.now(),
        uploadedAt: new Date().toISOString(),
      });
      console.log(`[DEBUG] ✅ Photo added: ${task.file.name}`);
    } else {
      console.log(`[DEBUG] Skipped: ${task.file.name}`);
    }

    // Update gallery metadata — increment photo count
    const gallerySnap = await galleryRef.get();
    const galleryData = gallerySnap.data() || {};
    const currentCount = galleryData.photoCount || 0;
    
    await galleryRef.update({
      photoCount: photoSnap.exists ? currentCount : currentCount + 1,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };

  } catch (error: any) {
    console.error("[DEBUG] Sync failure:", error);
    return { success: false, error: error.message || "Sync failed." };
  }
}

/**
 * Bulk delete R2 objects.
 */
export async function deleteGalleryFiles(storageKeys: string[]) {
  try {
    if (!storageKeys || storageKeys.length === 0) {
      return { success: true };
    }

    console.log(`[SERVER_DELETE] Purging ${storageKeys.length} assets`);

    const results = await Promise.allSettled(
      storageKeys.map(async key => {
        if (!key) return;
        try {
          const deletePromise = storage.deleteFile(key);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );
          await Promise.race([deletePromise, timeoutPromise]);
        } catch (e: any) {
          console.error(`[SERVER_DELETE] Failed: ${key}`, e.message);
          throw e;
        }
      })
    );

    const failures = results.filter(r => r.status === 'rejected');
    
    return { 
      success: failures.length === 0, 
      error: failures.length > 0 ? `${failures.length} assets failed.` : undefined 
    };
  } catch (error: any) {
    console.error("[SERVER_DELETE] CRITICAL:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a single photo from subcollection + R2.
 */
export async function deletePhoto({
  galleryId,
  photoId,
  storageKeys,
}: {
  galleryId: string;
  photoId: string;
  storageKeys: string[];
}) {
  try {
    if (!adminDb) {
      return { success: false, error: "DB offline" };
    }

    // Delete from subcollection
    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('photos')
      .doc(photoId)
      .delete();

    // Decrement count
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const snap = await galleryRef.get();
    const currentCount = snap.data()?.photoCount || 0;
    await galleryRef.update({
      photoCount: Math.max(currentCount - 1, 0),
      updatedAt: new Date().toISOString(),
    });

    // Delete from R2
    if (storageKeys.length > 0) {
      await deleteGalleryFiles(storageKeys.filter(Boolean));
    }

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_PHOTO] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Music signed URL (7 days max).
 */
export async function getMusicSignedUrl(key: string) {
  try {
    if (!key) return { success: false, error: "Missing key" };
    const url = await storage.getSignedUrl(key, 604800);
    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fresh music URL.
 */
export async function getFreshMusicUrl(storageKey: string) {
  try {
    if (!storageKey) return { success: false, error: "Missing key" };
    const url = await storage.getSignedUrl(storageKey, 604800);
    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Original photo download URL (15 min).
 */
export async function getOriginalDownloadUrl(originalKey: string) {
  try {
    if (!originalKey) return { success: false, error: "Missing key" };
    const exists = await storage.fileExists(originalKey);
    if (!exists) return { success: false, error: "File not found" };
    const url = await storage.getSignedUrl(originalKey, 900);
    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}