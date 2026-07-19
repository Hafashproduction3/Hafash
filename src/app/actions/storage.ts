'use server';

import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats } from '@/lib/storage/stats';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';
import { revalidatePath } from 'next/cache';

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
    return { success: false, error: "Database infrastructure offline. Please configure Firebase Admin credentials." };
  }

  try {
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
    
    revalidatePath(`/events/${galleryId}/manage`);
    revalidatePath(`/gallery/${galleryId}`);

    return { success: true };

  } catch (error: any) {
    console.error("[DEBUG] Sync failure:", error);
    await storage.deleteFile(task.key).catch(() => {});
    return { success: false, error: "Metadata synchronization failed." };
  }
}

/**
 * SERVER ACTION: Bulk delete R2 objects and revalidate paths.
 */
export async function deleteGalleryFiles(storageKeys: string[], galleryId: string) {
  try {
    if (!storageKeys || storageKeys.length === 0) {
      return { success: true };
    }

    console.log(`[DEBUG] Purging ${storageKeys.length} assets from R2 for gallery ${galleryId}`);

    const results = await Promise.allSettled(
      storageKeys.map(key => storage.deleteFile(key))
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[DEBUG] R2 Deletion partially failed: ${failures.length} errors.`);
    } else {
      console.log(`[DEBUG] R2 Delete response: All objects removed successfully.`);
    }

    try {
      if (galleryId) {
        revalidatePath(`/gallery/${galleryId}`);
        revalidatePath(`/events/${galleryId}/manage`);
        revalidatePath('/dashboard');
      }
    } catch (revalError) {
      console.warn("[DEBUG] Cache revalidation skipped.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("[DEBUG] Physical storage purge error:", error);
    return {
      success: false,
      error: error.message || "Failed to clear physical storage.",
    };
  }
}
