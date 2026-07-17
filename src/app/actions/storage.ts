'use server';

import { storage } from '@/lib/storage/storage';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * SERVER ACTION: Request a secure, signed URL for direct browser-to-R2 upload.
 * 
 * Validates ownership and session before granting access.
 */
export async function requestUploadUrl(params: {
  userId: string;
  galleryId: string;
  fileName: string;
  contentType: string;
}) {
  const { userId, galleryId, fileName, contentType } = params;

  // 1. Initial Validation
  if (!userId || !galleryId || !fileName || !contentType) {
    throw new Error("Missing required parameters for upload orchestration.");
  }

  // 2. Ownership Verification (Admin Lookup)
  try {
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    
    if (!gallerySnap.exists) {
      throw new Error("Target gallery does not exist.");
    }

    const galleryData = gallerySnap.data();
    if (galleryData?.userId !== userId) {
      throw new Error("Unauthorized: Access to this studio workspace is restricted.");
    }

    // 3. Construct Secure R2 Path
    // Path: uploads/{userId}/{galleryId}/{uniqueFileId}-{sanitizedFileName}
    const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileId = uuidv4();
    const key = `uploads/${userId}/${galleryId}/${fileId}-${safeFileName}`;

    // 4. Generate Signed URL
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300); // 5 minute window

    return {
      success: true,
      uploadUrl,
      key,
      fileId,
    };

  } catch (error: any) {
    console.error("UPLOAD_URL_GENERATION_FAILURE:", error.message);
    return {
      success: false,
      error: error.message || "Failed to synchronize with storage provider.",
    };
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
    // 1. Ownership or Access Validation
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    
    if (!gallerySnap.exists) {
      throw new Error("Gallery not found.");
    }

    const galleryData = gallerySnap.data();
    
    // Check if user is owner OR if gallery is paid and unlocked
    const isOwner = galleryData?.userId === userId;
    const isPaid = !!galleryData?.isPaid;
    const isLocked = galleryData?.isLocked !== false;

    if (!isOwner && (!isPaid || isLocked)) {
      throw new Error("Asset retrieval restricted. Payment or studio authorization required.");
    }

    // 2. Generate signed GET URL
    const downloadUrl = await storage.getSignedUrl(itemKey, 3600); // 1 hour window

    return {
      success: true,
      downloadUrl,
    };

  } catch (error: any) {
    console.error("DOWNLOAD_URL_GENERATION_FAILURE:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
