'use server';

import { getSubscriptionInfo } from '@/lib/subscription/status';
import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { getStorageStats, clearStorageStatsCache } from '@/lib/storage/stats';
import type { MultipartCompletedPart } from '@/lib/storage/storage';

const R2_PUBLIC_URL = 'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

function getPublicUrl(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `${R2_PUBLIC_URL}/${key}`;
}

// ✅ Signed URL cache (6 din tak)
const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 6 * 24 * 60 * 60 * 1000;

/**
 * ✅ Upload permission check
 */
async function checkUploadPermission(userId: string, fileSize: number) {
  if (!adminDb || !admin) {
    return { success: false as const, error: 'Database infrastructure offline.' };
  }

  if (!userId || !Number.isFinite(fileSize) || fileSize <= 0) {
    return { success: false as const, error: 'Invalid upload details.' };
  }

  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return { success: false as const, error: 'User profile not found.' };
  }

  const rawData = userSnap.data() || {};

  let authEmail: string | null = null;

  try {
    const userRecord = await admin.auth().getUser(userId);
    authEmail = userRecord.email || null;
  } catch (e: unknown) {
    console.warn(
      '[AUTH_EMAIL] Failed:',
      e instanceof Error ? e.message : e
    );
  }

  const subscriptionStatus = rawData.subscriptionStatus || (
    rawData.subscriptionNextRenewal &&
    new Date(rawData.subscriptionNextRenewal) > new Date()
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
  const isLocationOwner = rawData.role === 'location-owner';

  if (!isLocationOwner && subscription.state !== 'active') {
    return {
      success: false as const,
      error: subscription.state === 'grace'
        ? 'Your subscription has expired. Please renew your plan.'
        : 'Your subscription is inactive. Please complete payment.',
    };
  }

  if (!isLocationOwner) {
    // ✅ getStorageStats ab internally cached hai
    const stats = await getStorageStats(userId);
    const incomingSizeGb = fileSize / (1024 * 1024 * 1024);

    if (stats.usedGb + incomingSizeGb > stats.totalGb) {
      return {
        success: false as const,
        error: `Storage quota exceeded. Your ${stats.planName} plan limit is ${stats.totalGb}GB.`,
      };
    }
  }

  return { success: true as const };
}

function validateMultipartKey(
  userId: string,
  galleryId: string,
  key: string
): boolean {
  if (!userId || !galleryId || !key) return false;

  const expectedPrefix = `uploads/${userId}/${galleryId}/`;

  return (
    key.startsWith(expectedPrefix) &&
    !key.includes('..') &&
    !key.startsWith('/') &&
    !key.includes('\\')
  );
}

/**
 * Request a normal single-request upload URL.
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
  if (!adminDb) {
    return { success: false, error: 'Database infrastructure offline.' };
  }

  try {
    const permission = await checkUploadPermission(userId, fileSize);

    if (!permission.success) return permission;

    const fileId = crypto.randomUUID();
    const extension = fileName.split('.').pop() || 'bin';
    const safeExtension = /^[a-zA-Z0-9]{1,10}$/.test(extension)
      ? extension
      : 'bin';

    const key = `uploads/${userId}/${galleryId}/${fileId}.${safeExtension}`;
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 300);

    return { success: true, uploadUrl, key };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error.';
    console.error('[DEBUG] Upload auth failure:', error);
    return { success: false, error: message };
  }
}

/**
 * Request upload URLs for multiple files.
 */
export async function requestUploadUrls({
  userId,
  galleryId,
  files,
}: {
  userId: string;
  galleryId: string;
  files: Array<{
    id?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
    name?: string;
    type?: string;
    size?: number;
  }>;
}) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 100) {
    return {
      success: false,
      error: 'Invalid file list. Maximum 100 files per request.',
      results: [],
    };
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const id = file.id || '';
      const fileName = file.fileName || file.name || '';
      const contentType =
        file.contentType || file.type || 'application/octet-stream';
      const fileSize = file.fileSize ?? file.size ?? 0;

      try {
        const result = await requestUploadUrl({
          userId,
          galleryId,
          fileName,
          contentType,
          fileSize,
        });

        if (!result.success) {
          return {
            id,
            success: false,
            error: result.error,
          };
        }

        return {
          id,
          success: true,
          uploadUrl: result.uploadUrl,
          key: result.key,
        };
      } catch (error: unknown) {
        return {
          id,
          success: false,
          error: error instanceof Error
            ? error.message
            : 'Upload URL request failed.',
        };
      }
    })
  );

  const failed = results.some((result) => !result.success);

  return {
    success: !failed,
    results,
    error: failed
      ? 'One or more upload URLs could not be generated.'
      : undefined,
  };
}

/**
 * Start a multipart upload for a large original file.
 */
export async function startMultipartUpload({
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
  if (!adminDb) {
    return { success: false, error: 'Database infrastructure offline.' };
  }

  try {
    if (
      !galleryId ||
      !fileName ||
      !contentType ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return { success: false, error: 'Invalid multipart upload details.' };
    }

    const permission = await checkUploadPermission(userId, fileSize);

    if (!permission.success) return permission;

    const extension = fileName.split('.').pop() || 'bin';
    const safeExtension = /^[a-zA-Z0-9]{1,10}$/.test(extension)
      ? extension
      : 'bin';

    const key = `uploads/${userId}/${galleryId}/${crypto.randomUUID()}.${safeExtension}`;
    const uploadId = await storage.createMultipartUpload(key, contentType);

    return { success: true, key, uploadId };
  } catch (error: unknown) {
    console.error('[MULTIPART_START] Failed:', error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Could not start multipart upload.',
    };
  }
}

/**
 * Get a presigned URL for one multipart chunk.
 */
export async function getMultipartPartUrl({
  userId,
  galleryId,
  key,
  uploadId,
  partNumber,
}: {
  userId: string;
  galleryId: string;
  key: string;
  uploadId: string;
  partNumber: number;
}) {
  try {
    if (!validateMultipartKey(userId, galleryId, key) || !uploadId) {
      return { success: false, error: 'Invalid multipart upload details.' };
    }

    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > 10000
    ) {
      return { success: false, error: 'Invalid part number.' };
    }

    const url = await storage.getSignedUploadPartUrl(
      key,
      uploadId,
      partNumber,
      900
    );

    return { success: true, url };
  } catch (error: unknown) {
    console.error('[MULTIPART_PART_URL] Failed:', error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Could not create part URL.',
    };
  }
}

/**
 * Complete a multipart upload after all parts are uploaded.
 */
export async function finishMultipartUpload({
  userId,
  galleryId,
  key,
  uploadId,
  parts,
}: {
  userId: string;
  galleryId: string;
  key: string;
  uploadId: string;
  parts: MultipartCompletedPart[];
}) {
  try {
    if (!validateMultipartKey(userId, galleryId, key) || !uploadId) {
      return { success: false, error: 'Invalid multipart upload details.' };
    }

    if (
      !Array.isArray(parts) ||
      parts.length === 0 ||
      parts.length > 10000 ||
      parts.some(
        (part) =>
          !part ||
          !Number.isInteger(part.PartNumber) ||
          part.PartNumber < 1 ||
          part.PartNumber > 10000 ||
          typeof part.ETag !== 'string' ||
          part.ETag.length === 0 ||
          part.ETag.length > 256
      )
    ) {
      return { success: false, error: 'Invalid multipart parts.' };
    }

    await storage.completeMultipartUpload(key, uploadId, parts);

    const exists = await storage.fileExists(key);

    if (!exists) {
      return {
        success: false,
        error: 'Multipart upload completed, but the object could not be verified.',
      };
    }

    return { success: true, key };
  } catch (error: unknown) {
    console.error('[MULTIPART_COMPLETE] Failed:', error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Could not complete multipart upload.',
    };
  }
}

/**
 * Abort an unfinished multipart upload.
 */
export async function abortMultipartUpload({
  userId,
  galleryId,
  key,
  uploadId,
}: {
  userId: string;
  galleryId: string;
  key: string;
  uploadId: string;
}) {
  try {
    if (!validateMultipartKey(userId, galleryId, key) || !uploadId) {
      return { success: false, error: 'Invalid multipart upload details.' };
    }

    await storage.abortMultipartUpload(key, uploadId);

    return { success: true };
  } catch (error: unknown) {
    console.error('[MULTIPART_ABORT] Failed:', error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Could not abort multipart upload.',
    };
  }
}

/**
 * Save uploaded photo metadata in Firestore.
 * ✅ Parallel: fileExists + gallery fetch ek saath
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
    file: { name: string; size: number; type: string };
  };
}) {
  if (!adminDb || !admin) {
    return { success: false, error: 'Database offline.' };
  }

  try {
    const galleryRef = adminDb.collection('galleries').doc(galleryId);

    // ✅ Parallel: fileExists + gallery fetch
    const [exists, gallerySnap] = await Promise.all([
      storage.fileExists(task.key),
      galleryRef.get(),
    ]);

    if (!exists) {
      return { success: false, error: 'Asset missing from storage.' };
    }

    const assetUrl = getPublicUrl(task.key);
    const thumbUrl = task.thumbKey ? getPublicUrl(task.thumbKey) : assetUrl;
    const originalUrl = task.originalKey && task.originalReady
      ? getPublicUrl(task.originalKey)
      : null;

    const photosRef = galleryRef.collection('photos');
    const photoDocRef = photosRef.doc(task.id);
    const photoSnap = await photoDocRef.get();

    if (photoSnap.exists && task.originalReady) {
      await photoDocRef.update({
        originalKey: task.originalKey,
        originalUrl,
        originalReady: true,
        originalSize: task.file.size,
        originalUpdatedAt: new Date().toISOString(),
      });
    } else if (!photoSnap.exists) {
      await photoDocRef.set({
        id: task.id,
        url: assetUrl,
        masterUrl: assetUrl,
        thumbUrl,
        thumbKey: task.thumbKey || null,
        storageKey: task.key,
        previewKey: task.key,
        originalKey: task.originalKey || null,
        originalUrl,
        originalReady: task.originalReady || false,
        fileName: task.file.name,
        fileSize: task.file.size,
        contentType: task.file.type,
        isFavorite: false,
        order: Date.now(),
        uploadedAt: new Date().toISOString(),
      });
    }

    const galleryData = gallerySnap.data() || {};
    const currentCount = galleryData.photoCount || 0;

    await galleryRef.update({
      photoCount: photoSnap.exists ? currentCount : currentCount + 1,
      updatedAt: new Date().toISOString(),
    });

    // ✅ Storage cache clear karein — naya photo add hua
    clearStorageStatsCache(userId);

    return { success: true };
  } catch (error: unknown) {
    console.error('[DEBUG] Sync failure:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed.',
    };
  }
}

/**
 * Refresh photo URLs — signed URLs + cache.
 */
export async function refreshPhotoUrls(keys: string[]): Promise<{
  success: boolean;
  urls: Record<string, string>;
  error?: string;
}> {
  try {
    if (!keys || keys.length === 0) {
      return { success: true, urls: {} };
    }

    if (keys.length > 300) {
      return { success: false, urls: {}, error: 'Too many keys (max 300)' };
    }

    const urlMap: Record<string, string> = {};
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    const now = Date.now();
    const keysToFetch: string[] = [];

    for (const key of uniqueKeys) {
      const cached = signedUrlCache.get(key);

      if (cached && cached.expires > now) {
        urlMap[key] = cached.url;
      } else {
        keysToFetch.push(key);
      }
    }

    if (keysToFetch.length > 0) {
      await Promise.all(
        keysToFetch.map(async (key) => {
          try {
            const signedUrl = await storage.getSignedUrl(key, 604800);

            urlMap[key] = signedUrl;
            signedUrlCache.set(key, {
              url: signedUrl,
              expires: now + CACHE_TTL,
            });
          } catch (err: unknown) {
            console.warn(
              `[SIGNED_URL_FAIL] ${key}`,
              err instanceof Error ? err.message : err
            );
            urlMap[key] = getPublicUrl(key);
          }
        })
      );
    }

    return { success: true, urls: urlMap };
  } catch (error: unknown) {
    return {
      success: false,
      urls: {},
      error: error instanceof Error ? error.message : 'Could not refresh URLs.',
    };
  }
}

export async function deleteGalleryFiles(storageKeys: string[]) {
  try {
    if (!storageKeys || storageKeys.length === 0) {
      return { success: true };
    }

    const results = await Promise.allSettled(
      storageKeys.map(async (key) => {
        if (!key) return;

        try {
          const deletePromise = storage.deleteFile(key);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );

          await Promise.race([deletePromise, timeoutPromise]);
        } catch (error: unknown) {
          console.error(
            `[SERVER_DELETE] Failed: ${key}`,
            error instanceof Error ? error.message : error
          );
          throw error;
        }
      })
    );

    const failures = results.filter((result) => result.status === 'rejected');

    return {
      success: failures.length === 0,
      error: failures.length > 0
        ? `${failures.length} assets failed.`
        : undefined,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed.',
    };
  }
}

export async function deletePhoto({
  galleryId,
  photoId,
  storageKeys,
  userId,
}: {
  galleryId: string;
  photoId: string;
  storageKeys: string[];
  userId?: string;
}) {
  try {
    if (!adminDb) {
      return { success: false, error: 'DB offline' };
    }

    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('photos')
      .doc(photoId)
      .delete();

    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const snap = await galleryRef.get();
    const currentCount = snap.data()?.photoCount || 0;

    await galleryRef.update({
      photoCount: Math.max(currentCount - 1, 0),
      updatedAt: new Date().toISOString(),
    });

    if (storageKeys.length > 0) {
      await deleteGalleryFiles(storageKeys.filter(Boolean));
    }

    // ✅ Storage cache clear karein — photo delete hua
    if (userId) {
      clearStorageStatsCache(userId);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('[DELETE_PHOTO] Error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed.',
    };
  }
}

export async function getMusicSignedUrl(key: string) {
  try {
    if (!key) return { success: false, error: 'Missing key' };

    const url = await storage.getSignedUrl(key, 604800);

    return { success: true, url };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sign URL.',
    };
  }
}

export async function getFreshMusicUrl(storageKey: string) {
  try {
    if (!storageKey) return { success: false, error: 'Missing key' };

    const url = await storage.getSignedUrl(storageKey, 604800);

    return { success: true, url };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sign URL.',
    };
  }
}

export async function getOriginalDownloadUrl(originalKey: string) {
  try {
    if (!originalKey) return { success: false, error: 'Missing key' };

    const url = await storage.getSignedUrl(originalKey, 604800);

    return { success: true, url };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sign URL.',
    };
  }
}