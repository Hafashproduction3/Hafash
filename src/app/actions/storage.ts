'use server';

import { storage } from '@/lib/storage/storage';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
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

  // 1. Initial Validation
  if (!userId || !galleryId || !fileName || !contentType || !fileSize) {
    return { success: false, error: "Missing transmission parameters." };
  }

  // 2. Firebase Admin Check
  if (!adminDb) {
    console.error("[STORAGE_ERROR] Firebase Admin not initialized.");
    return { success: false, error: "Cloud storage database is offline." };
  }

  try {
    // 3. Quota Verification
    const stats = await getStorageStats(userId);
    const incomingGb = fileSize / (1024 * 1024 * 1024);
    
    if (stats.usedGb + incomingGb > stats.totalGb) {
      return { 
        success: false, 
        error: `Storage Quota Exceeded. You have ${stats.remainingGb.toFixed(2)}GB left, but this file requires ${incomingGb.toFixed(4)}GB.` 
      };
    }

    // 4. Ownership Verification
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) {
      return { success: false, error: "Target gallery record not found." };
    }
    
    const galleryData = gallerySnap.data();
    if (galleryData?.userId !== userId) {
      return { success: false, error: "Unauthorized workspace access." };
    }

    // 5. Construct Secure R2 Path
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileId = uuidv4();
    const key = `uploads/${userId}/${galleryId}/${fileId}-${safeFileName}`;

    // 6. Generate Signed URL
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    if (!uploadUrl) {
      throw new Error("Failed to generate secure upload channel.");
    }

    // 7. Audit Log
    console.log(`[STORAGE_AUDIT][UPLOAD_REQ] User:${userId} Gallery:${galleryId} File:${fileName}`);

    return {
      success: true,
      uploadUrl,
      key,
      fileId,
    };

  } catch (error: any) {
    console.error("[STORAGE_CRITICAL] requestUploadUrl failure:", error);
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

  try {
    const metadata = await storage.getFileMetadata(task.key);
    if (!metadata) throw new Error("Cloud synchronization verification failed. Object not found.");

    if (metadata.size !== task.file.size) {
      console.warn(`[STORAGE_INTEGRITY] Size mismatch for ${task.key}. Expected:${task.file.size} Got:${metadata.size}`);
    }

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

    if (!adminDb) throw new Error("Database offline.");
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    
    await galleryRef.update({
      items: admin.firestore.FieldValue.arrayUnion(uploadedItem),
      updatedAt: new Date().toISOString()
    });

    console.log(`[STORAGE_AUDIT][UPLOAD_SYNC] Success: ${task.key}`);
    return { success: true };

  } catch (error: any) {
    console.error("[STORAGE_CRITICAL] completeUpload failure:", error);
    
    // Attempt rollback
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
