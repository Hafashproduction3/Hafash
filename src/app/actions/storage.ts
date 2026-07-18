'use server';

import { storage } from '@/lib/storage/storage';
import { adminDb } from '@/lib/firebase-admin';
import { getStorageStats } from '@/lib/storage/stats';
import * as admin from 'firebase-admin';

/**
 * SERVER ACTION: Request a secure, signed URL for direct browser-to-R2 upload.
 */
export async function requestUploadUrl(params: {
  userId: string;
  galleryId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  const { userId, galleryId, fileName, contentType, fileSize } = params;

  console.log(`[UPLOAD_TRACE][START] requestUploadUrl for ${fileName} (${fileSize} bytes)`);

  // 1. Initial Validation
  if (!userId || !galleryId || !fileName || !contentType || !fileSize) {
    console.error("[UPLOAD_TRACE][ERROR] Missing transmission parameters");
    return { success: false, error: "Missing transmission parameters." };
  }

  // 2. Firebase Admin Check
  if (!adminDb) {
    console.error("[UPLOAD_TRACE][ERROR] Firebase Admin not initialized");
    return { success: false, error: "Cloud storage database is offline." };
  }

  try {
    // 3. Quota Verification
    console.log("[UPLOAD_TRACE][STEP] Checking storage stats...");
    const stats = await getStorageStats(userId);
    const incomingGb = fileSize / (1024 * 1024 * 1024);
    
    if (stats.usedGb + incomingGb > stats.totalGb) {
      console.error(`[UPLOAD_TRACE][ERROR] Quota exceeded: ${stats.usedGb.toFixed(4)} + ${incomingGb.toFixed(4)} > ${stats.totalGb}`);
      return { 
        success: false, 
        error: `Storage Quota Exceeded. You have ${stats.remainingGb.toFixed(2)}GB left, but this file requires ${incomingGb.toFixed(4)}GB.` 
      };
    }

    // 4. Ownership Verification
    console.log("[UPLOAD_TRACE][STEP] Verifying gallery ownership...");
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) {
      console.error("[UPLOAD_TRACE][ERROR] Gallery not found");
      return { success: false, error: "Target gallery record not found." };
    }
    
    const galleryData = gallerySnap.data();
    if (galleryData?.userId !== userId) {
      console.error("[UPLOAD_TRACE][ERROR] Unauthorized workspace access");
      return { success: false, error: "Unauthorized workspace access." };
    }

    // 5. Construct Secure R2 Path using native crypto
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileId = crypto.randomUUID();
    const key = `uploads/${userId}/${galleryId}/${fileId}-${safeFileName}`;

    // 6. Generate Signed URL
    console.log("[UPLOAD_TRACE][STEP] Generating signed PUT URL...");
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    if (!uploadUrl) {
      throw new Error("Failed to generate secure upload channel.");
    }

    console.log(`[UPLOAD_TRACE][SUCCESS] Signed URL created for key: ${key}`);

    return {
      success: true,
      uploadUrl,
      key,
      fileId,
    };

  } catch (error: any) {
    console.error("[UPLOAD_TRACE][CRITICAL] requestUploadUrl failure:");
    console.error(error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred during storage authorization." 
    };
  }
}

/**
 * SERVER ACTION: Post-upload metadata synchronization.
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
  console.log(`[UPLOAD_TRACE][START] completeUpload for key: ${task.key}`);

  try {
    // 1. Verify object exists in R2
    console.log("[UPLOAD_TRACE][STEP] Verifying cloud asset integrity...");
    const metadata = await storage.getFileMetadata(task.key);
    if (!metadata) {
      console.error("[UPLOAD_TRACE][ERROR] Asset not found in R2 after upload");
      throw new Error("Cloud synchronization verification failed. Object not found.");
    }

    if (metadata.size !== task.file.size) {
      console.warn(`[UPLOAD_TRACE][WARN] Size mismatch for ${task.key}. Expected:${task.file.size} Got:${metadata.size}`);
    }

    // Construct public-friendly URL if available, otherwise fallback to standard R2 format
    const assetUrl = `${process.env.R2_PUBLIC_URL}/${task.key}`;
    
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

    if (!adminDb) {
      console.error("[UPLOAD_TRACE][ERROR] Database offline during sync");
      throw new Error("Database offline.");
    }

    console.log("[UPLOAD_TRACE][STEP] Updating Firestore metadata...");
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    
    await galleryRef.update({
      items: admin.firestore.FieldValue.arrayUnion(uploadedItem),
      updatedAt: new Date().toISOString()
    });

    console.log(`[UPLOAD_TRACE][SUCCESS] Firestore updated for: ${task.key}`);
    return { success: true };

  } catch (error: any) {
    console.error("[UPLOAD_TRACE][CRITICAL] completeUpload failure:");
    console.error(error);
    
    // Attempt rollback to keep R2 clean
    try {
      console.log("[UPLOAD_TRACE][ROLLBACK] Purging orphaned cloud object...");
      await storage.deleteFile(task.key);
    } catch (delError) {
      console.error("[UPLOAD_TRACE][ROLLBACK_ERROR] Rollback deletion failed:", task.key);
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
    if (!adminDb) throw new Error("Database offline.");
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
    console.error("[STORAGE_CRITICAL] requestDownloadUrl failure:", error);
    return { success: false, error: error.message };
  }
}
