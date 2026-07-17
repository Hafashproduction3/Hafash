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
  console.log(">>> [DEBUG] START requestUploadUrl");
  const { userId, galleryId, fileName, contentType, fileSize } = params;

  // 1. Log Received Parameters
  console.log(">>> [DEBUG] Received Parameters:", { userId, galleryId, fileName, contentType, fileSize });

  // 2. Check Environment Variables Presence
  console.log(">>> [DEBUG] Environment Variables Status:");
  console.log(" - R2_ACCOUNT_ID exists:", !!process.env.R2_ACCOUNT_ID);
  console.log(" - R2_BUCKET_NAME exists:", !!process.env.R2_BUCKET_NAME);
  console.log(" - R2_ACCESS_KEY_ID exists:", !!process.env.R2_ACCESS_KEY_ID);
  console.log(" - R2_SECRET_ACCESS_KEY exists:", !!process.env.R2_SECRET_ACCESS_KEY);
  console.log(" - R2_ENDPOINT exists:", !!process.env.R2_ENDPOINT);
  console.log(" - R2_SIGNED_URL_EXPIRATION exists:", !!process.env.R2_SIGNED_URL_EXPIRATION);

  // 3. Initial Validation
  if (!userId || !galleryId || !fileName || !contentType || !fileSize) {
    console.error(">>> [DEBUG] Validation Failed: Missing transmission parameters.");
    return { success: false, error: "Missing transmission parameters." };
  }

  // 4. Firebase Admin Check
  if (!adminDb) {
    console.error(">>> [DEBUG] ERROR: adminDb is NOT initialized. Check FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL.");
    return { success: false, error: "Cloud storage database is offline." };
  }
  console.log(">>> [DEBUG] Authentication/Admin Status: adminDb initialized.");

  try {
    // 5. Quota Verification
    console.log(">>> [DEBUG] START getStorageStats for user:", userId);
    const stats = await getStorageStats(userId);
    console.log(">>> [DEBUG] END getStorageStats");
    console.log(">>> [DEBUG] Storage Stats Result:", stats);

    const incomingGb = fileSize / (1024 * 1024 * 1024);
    if (stats.usedGb + incomingGb > stats.totalGb) {
      console.error(">>> [DEBUG] Quota Exceeded:", { usedGb: stats.usedGb, incomingGb, limit: stats.totalGb });
      return { 
        success: false, 
        error: `Storage Quota Exceeded. You have ${stats.remainingGb.toFixed(2)}GB left, but this file requires ${incomingGb.toFixed(4)}GB.` 
      };
    }

    // 6. Ownership Verification
    console.log(">>> [DEBUG] START Gallery Lookup:", galleryId);
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    console.log(">>> [DEBUG] END Gallery Lookup");

    if (!gallerySnap.exists) {
      console.error(">>> [DEBUG] Gallery Exists: FALSE");
      throw new Error("Target gallery record lost.");
    }
    console.log(">>> [DEBUG] Gallery Exists: TRUE");
    
    const galleryData = gallerySnap.data();
    console.log(">>> [DEBUG] Gallery Owner check:", { recordUserId: galleryData?.userId, sessionUserId: userId });
    if (galleryData?.userId !== userId) {
      console.error(">>> [DEBUG] Gallery Owner: MISMATCH");
      throw new Error("Unauthorized workspace access.");
    }
    console.log(">>> [DEBUG] Gallery Owner: MATCH");

    // 7. Construct Secure R2 Path
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileId = uuidv4();
    const key = `uploads/${userId}/${galleryId}/${fileId}-${safeFileName}`;
    console.log(">>> [DEBUG] Generated Key:", key);

    // 8. Generate Signed URL
    console.log(">>> [DEBUG] START Signed URL Generation");
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);
    console.log(">>> [DEBUG] END Signed URL Generation");

    if (!uploadUrl) {
      console.error(">>> [DEBUG] Upload URL Created: FALSE (signedUrl returned empty)");
      throw new Error("Failed to generate secure upload channel.");
    }
    console.log(">>> [DEBUG] Upload URL Created: TRUE");

    // 9. Audit Log (Console)
    console.log(`[STORAGE_AUDIT][UPLOAD_REQ] User:${userId} Gallery:${galleryId} File:${fileName} Size:${fileSize}`);

    console.log(">>> [DEBUG] RETURN Success");
    return {
      success: true,
      uploadUrl,
      key,
      fileId,
    };

  } catch (error: any) {
    console.error(">>> [DEBUG] FULL ERROR IN requestUploadUrl:");
    console.error(error);
    if (error.stack) console.error(error.stack);
    return { success: false, error: error.message };
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
    console.error(">>> [DEBUG] FULL ERROR IN completeUpload:");
    console.error(error);
    if (error.stack) console.error(error.stack);
    
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
    console.error(">>> [DEBUG] FULL ERROR IN requestDownloadUrl:");
    console.error(error);
    if (error.stack) console.error(error.stack);
    return { success: false, error: error.message };
  }
}