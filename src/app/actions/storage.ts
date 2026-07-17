'use server';

import { storage } from '@/lib/storage/storage';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { getStorageStats } from '@/lib/storage/stats';
import * as admin from 'firebase-admin';

/**
 * SERVER ACTION: Request a secure, signed URL for direct browser-to-R2 upload.
 * 
 * Hardened for production with:
 * 1. Ownership validation.
 * 2. Storage quota enforcement.
 * 3. Path integrity.
 * 4. Audit logging.
 */
export async function requestUploadUrl(params: {
  userId: string;
  galleryId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  const { userId, galleryId, fileName, contentType, fileSize } = params;

  // 1. Initial Validation
  if (!userId || !galleryId || !fileName || !contentType || !fileSize) {
    return { success: false, error: "Missing transmission parameters." };
  }

  try {
    // 2. Ownership & Quota Verification
    const stats = await getStorageStats(userId);
    const incomingGb = fileSize / (1024 * 1024 * 1024);

    if (stats.usedGb + incomingGb > stats.totalGb) {
      return { 
        success: false, 
        error: `Storage Quota Exceeded. You have ${stats.remainingGb.toFixed(2)}GB left, but this file requires ${incomingGb.toFixed(4)}GB.` 
      };
    }

    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) throw new Error("Target gallery record lost.");
    
    const galleryData = gallerySnap.data();
    if (galleryData?.userId !== userId) throw new Error("Unauthorized workspace access.");

    // 3. Construct Secure R2 Path
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileId = uuidv4();
    const key = `uploads/${userId}/${galleryId}/${fileId}-${safeFileName}`;

    // 4. Generate Signed URL (5 min window)
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    // 5. Audit Log (Console)
    console.log(`[STORAGE_AUDIT][UPLOAD_REQ] User:${userId} Gallery:${galleryId} File:${fileName} Size:${fileSize}`);

    return {
      success: true,
      uploadUrl,
      key,
      fileId,
    };

  } catch (error: any) {
    console.error("UPLOAD_ORCHESTRATION_FAILURE:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * SERVER ACTION: Post-upload metadata synchronization with transaction safety.
 * 
 * Verifies the upload, updates Firestore, and rolls back if sync fails to prevent orphans.
 */
export async function completeUpload(params: {
  userId: string;
  galleryId: string;
  task: {
    id: string;
    key: string;
    file: { name: string; size: number; type: string };
  }
}) {
  const { userId, galleryId, task } = params;

  try {
    // 1. Integrity Verification
    const metadata = await storage.getFileMetadata(task.key);
    if (!metadata) throw new Error("Cloud synchronization verification failed. Object not found.");

    // Verify size matches within a reasonable margin or exactly
    if (metadata.size !== task.file.size) {
      console.warn(`[STORAGE_INTEGRITY] Size mismatch for ${task.key}. Expected:${task.file.size} Got:${metadata.size}`);
    }

    // 2. Firestore Sync
    // We use a standardized R2 path pattern. 
    // In a custom domain setup, this would be https://cdn.hafash.pk/...
    // For now, we store the path which can be resolved to a signed URL or public R2 URL.
    const assetUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${task.key}`;
    
    const uploadedItem = {
      id: task.id,
      url: assetUrl,
      masterUrl: assetUrl,
      type: task.file.type.startsWith('video') ? 'video' : 'image',
      isFavorite: false,
      fileName: task.file.name,
      fileSize: task.file.size,
      storageKey: task.key,
      createdAt: new Date().toISOString()
    };

    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    
    await galleryRef.update({
      items: admin.firestore.FieldValue.arrayUnion(uploadedItem),
      updatedAt: new Date().toISOString()
    });

    console.log(`[STORAGE_AUDIT][UPLOAD_SYNC] Success: ${task.key}`);
    return { success: true };

  } catch (error: any) {
    console.error("SYNC_FAILURE_TRIGGERING_ROLLBACK:", error.message);
    
    // 3. Rollback: Delete orphan object if DB sync failed
    try {
      await storage.deleteFile(task.key);
      console.log(`[STORAGE_AUDIT][ROLLBACK] Purged orphan: ${task.key}`);
    } catch (delError) {
      console.error("[STORAGE_CRITICAL] Rollback deletion failed. Orphan created:", task.key);
    }

    return { success: false, error: error.message };
  }
}

/**
 * SERVER ACTION: Request a secure, signed URL for direct R2 retrieval.
 */
export async function requestDownloadUrl(params: {
  userId: string;
  galleryId: string;
  itemKey: string;
}) {
  const { userId, galleryId, itemKey } = params;

  try {
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) throw new Error("Gallery not found.");

    const galleryData = gallerySnap.data();
    const isOwner = galleryData?.userId === userId;
    const isPaid = !!galleryData?.isPaid;
    const isLocked = galleryData?.isLocked !== false;

    if (!isOwner && (!isPaid || isLocked)) {
      throw new Error("Asset retrieval restricted. Payment or studio authorization required.");
    }

    const downloadUrl = await storage.getSignedUrl(itemKey, 3600); 

    return {
      success: true,
      downloadUrl,
    };

  } catch (error: any) {
    console.error("DOWNLOAD_URL_GENERATION_FAILURE:", error.message);
    return { success: false, error: error.message };
  }
}
