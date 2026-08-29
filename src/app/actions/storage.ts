'use server';
import { getSubscriptionInfo } from '@/lib/subscription/status';

import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats } from '@/lib/storage/stats';

/**
 * SERVER ACTION: Request a signed URL for direct-to-R2 upload.
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

    const userData = userSnap.data();

    const subscription = getSubscriptionInfo(userData);

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
 */
export async function completeUpload({
  userId,
  galleryId,
  task,
}: {
  userId: string;
  galleryId: string;
  task: { id: string; key: string; file: { name: string; size: number; type: string } };
}) {
  console.log(`[DEBUG] completeUpload start for ${task.file.name}`);

  if (!adminDb || !admin) {
    return { success: false, error: "Database offline. Metadata synchronization failed." };
  }

  try {
    const exists = await storage.fileExists(task.key);
    if (!exists) {
      return { success: false, error: "Asset missing from storage. Handshake failed." };
    }

    const assetUrl = await storage.getSignedUrl(task.key, 604800);

    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const newAsset = {
      id: task.id,
      url: assetUrl,
      masterUrl: assetUrl, 
      storageKey: task.key,
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

    console.log(`[DEBUG] Firestore update response: Metadata synced for ${task.file.name}`);
    
    return { success: true };

  } catch (error: any) {
    console.error("[DEBUG] Sync failure:", error);
    await storage.deleteFile(task.key).catch(() => {});
    return { success: false, error: "Metadata synchronization failed." };
  }
}

/**
 * SERVER ACTION: Bulk delete R2 objects.
 * Instrumented for high-performance tracing.
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
          // Hard 5-second internal timeout per file to prevent action hang
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
      console.warn(`[SERVER_DELETE] PARTIAL_FAILURE: ${failures.length} assets failed to purge.`);
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