'use server';

import { adminDb } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats } from '@/lib/storage/stats';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

/**
 * SERVER ACTION: Request a signed URL for direct-to-R2 upload.
 * Includes multi-layer security: Auth, Ownership, and Quota.
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
  console.log(`[STORAGE_ACTION] START requestUploadUrl for ${fileName} (${fileSize} bytes)`);

  if (!adminDb) {
    console.error("[STORAGE_ACTION] Firebase Admin is NOT initialized. Check FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL.");
    return { success: false, error: "Database infrastructure offline. Please configure Firebase Admin credentials." };
  }

  try {
    // 1. Quota Check
    const stats = await getStorageStats(userId);
    const incomingSizeGb = fileSize / (1024 * 1024 * 1024);
    
    if ((stats.usedGb + incomingSizeGb) > stats.totalGb) {
      return { 
        success: false, 
        error: `Storage quota exceeded. Your ${stats.planName} plan limit is ${stats.totalGb}GB.` 
      };
    }

    // 2. Ownership Check
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) {
      return { success: false, error: "Target gallery not found." };
    }

    const galleryData = gallerySnap.data();
    if (galleryData?.userId !== userId) {
      return { success: false, error: "Unauthorized. You do not own this gallery." };
    }

    // 3. Generate Secure Key
    const fileId = crypto.randomUUID();
    const extension = fileName.split('.').pop();
    const key = `uploads/${userId}/${galleryId}/${fileId}.${extension}`;

    // 4. Sign URL
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    console.log(`[STORAGE_ACTION] SUCCESS: Signed URL generated for ${key}`);
    return { success: true, uploadUrl, key };

  } catch (error: any) {
    console.error("[STORAGE_ACTION] CRITICAL FAILURE in requestUploadUrl:", error);
    return { success: false, error: error.message || "An internal error occurred." };
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
  console.log(`[STORAGE_ACTION] START completeUpload for ${task.file.name}`);

  if (!adminDb) {
    return { success: false, error: "Database offline. Metadata synchronization failed." };
  }

  try {
    // 1. Verify file exists in R2
    const exists = await storage.fileExists(task.key);
    if (!exists) {
      return { success: false, error: "Asset missing from storage. Handshake failed." };
    }

    // 2. Construct public-ready asset URL (Using direct R2 worker or public bucket URL pattern)
    // Note: In production, this would typically point to a custom domain or Cloudflare Worker.
    const assetUrl = await storage.getSignedUrl(task.key, 604800); // 7-day signed link as fallback

    // 3. Update Firestore
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const newAsset = {
      id: task.id,
      url: assetUrl,
      masterUrl: assetUrl, // In MVP, master and web-optimized are same
      storageKey: task.key,
      fileName: task.file.name,
      fileSize: task.file.size,
      contentType: task.file.type,
      isFavorite: false,
      uploadedAt: new Date().toISOString(),
    };

    const { FieldValue } = require('firebase-admin/firestore');
    await galleryRef.update({
      items: FieldValue.arrayUnion(newAsset),
      updatedAt: new Date().toISOString()
    });

    console.log(`[STORAGE_ACTION] SUCCESS: Metadata synced for ${task.file.name}`);
    return { success: true };

  } catch (error: any) {
    console.error("[STORAGE_ACTION] SYNC FAILURE:", error);
    // Cleanup orphaned file if DB update fails
    await storage.deleteFile(task.key).catch(() => {});
    return { success: false, error: "Metadata synchronization failed. Asset rolled back." };
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

    console.log(`[STORAGE_ACTION] Purging ${storageKeys.length} assets from R2...`);

    // Concurrent deletion
    const results = await Promise.allSettled(
      storageKeys.map(key => storage.deleteFile(key))
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[STORAGE_ACTION] Deletion partially failed: ${failures.length} errors.`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[STORAGE_ACTION] DELETE_ERROR", error);
    return {
      success: false,
      error: error.message || "Failed to clear physical storage.",
    };
  }
}
