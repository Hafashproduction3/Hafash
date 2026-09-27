'use server';
import { getUserPlan } from '@/lib/plans';
import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';

function detectFileType(contentType: string): 'image' | 'video' | 'file' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return 'file';
}

/**
 * ✅ CREATE FOLDER
 */
export async function createDriveFolder({
  userId,
  name,
  parentId = null,
}: {
  userId: string;
  name: string;
  parentId?: string | null;
}) {
  console.log('[DRIVE_CREATE_FOLDER] start:', { userId, name, parentId });
  
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const rootRef = adminDb.collection('users').doc(userId).collection('drive').doc('root');
    
    const rootSnap = await rootRef.get();
    if (!rootSnap.exists) {
      await rootRef.set({ createdAt: new Date().toISOString() });
    }

    const folderRef = rootRef.collection('folders').doc();
    const now = new Date().toISOString();

    await folderRef.set({
      id: folderRef.id,
      name: name.trim(),
      parentId: parentId || null,
      fileCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    console.log('[DRIVE_CREATE_FOLDER] ✅ success:', folderRef.id);
    return { success: true, folderId: folderRef.id };
  } catch (error: any) {
    console.error('[DRIVE_CREATE_FOLDER] ❌ ERROR:', error);
    return { success: false, error: error.message || 'Folder creation failed' };
  }
}

/**
 * ✅ DELETE FOLDER + R2 files
 */
export async function deleteDriveFolder({
  userId,
  folderId,
}: {
  userId: string;
  folderId: string;
}) {
  console.log('[DRIVE_DELETE_FOLDER] start:', { userId, folderId });
  
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const rootRef = adminDb.collection('users').doc(userId).collection('drive').doc('root');

    const filesSnap = await rootRef
      .collection('files')
      .where('folderId', '==', folderId)
      .get();

    const keysToDelete: string[] = [];
    filesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.storageKey) keysToDelete.push(data.storageKey);
      if (data.thumbKey) keysToDelete.push(data.thumbKey);
    });

    await rootRef.collection('folders').doc(folderId).delete();

    for (const doc of filesSnap.docs) {
      try {
        await doc.ref.delete();
      } catch (e: any) {
        console.error('[DRIVE_DELETE_FOLDER] File delete failed:', e.message);
      }
    }

    for (const key of keysToDelete) {
      try {
        await storage.deleteFile(key);
      } catch (e: any) {
        console.error('[R2_DELETE_FOLDER]', key, e.message);
      }
    }

    console.log('[DRIVE_DELETE_FOLDER] ✅ COMPLETE');
    return { success: true, deletedFiles: filesSnap.size };
  } catch (error: any) {
    console.error('[DRIVE_DELETE_FOLDER] ❌ FATAL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ RENAME FOLDER
 */
export async function renameDriveFolder({
  userId,
  folderId,
  newName,
}: {
  userId: string;
  folderId: string;
  newName: string;
}) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root')
      .collection('folders').doc(folderId)
      .update({
        name: newName.trim(),
        updatedAt: new Date().toISOString(),
      });

    return { success: true };
  } catch (error: any) {
    console.error('[DRIVE_RENAME_FOLDER]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ REQUEST UPLOAD URL
 */
export async function requestDriveUploadUrl({
  userId,
  folderId,
  fileName,
  contentType,
  fileSize,
}: {
  userId: string;
  folderId: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  console.log('[DRIVE_UPLOAD_URL] start:', fileName);
  
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (!userSnap.exists) return { success: false, error: 'User not found' };

    const rawData = userSnap.data() || {};

    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
    } catch (e: any) {}

    const plan = getUserPlan(rawData.planId, authEmail);
    const now = Date.now();
    const expiry = rawData.planExpiryDate ? new Date(rawData.planExpiryDate).getTime() : 0;
    const isOwner = authEmail === 'hafashgroup60@gmail.com';
    const isActive = isOwner || (plan.id !== 'none' && expiry > now);

    if (!isActive) {
      return { success: false, error: 'Subscription inactive.' };
    }

    const stats = await getDriveStorageStats(userId);
    const incomingGb = fileSize / (1024 * 1024 * 1024);

    if ((stats.usedGb + incomingGb) > stats.totalGb) {
      return {
        success: false,
        error: `Storage full. Used ${stats.usedGb.toFixed(2)}GB of ${stats.totalGb}GB.`,
      };
    }

    const fileId = crypto.randomUUID();
    const extension = fileName.split('.').pop();
    const storageKey = `drive/${userId}/${folderId || 'root'}/${fileId}.${extension}`;

    const uploadUrl = await storage.getSignedUploadUrl(storageKey, contentType, 300);

    return { success: true, uploadUrl, key: storageKey, fileId };
  } catch (error: any) {
    console.error('[DRIVE_UPLOAD_URL] ERROR:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ COMPLETE UPLOAD
 */
export async function completeDriveUpload({
  userId,
  folderId,
  task,
}: {
  userId: string;
  folderId: string | null;
  task: {
    id: string;
    key: string;
    thumbKey?: string;
    file: { name: string; size: number; type: string };
  };
}) {
  console.log('[DRIVE_COMPLETE_UPLOAD] start:', task.file.name);
  
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const exists = await storage.fileExists(task.key);
    if (!exists) return { success: false, error: 'File not in R2' };

    const assetUrl = await storage.getSignedUrl(task.key, 604800);
    const thumbUrl = task.thumbKey
      ? await storage.getSignedUrl(task.thumbKey, 604800)
      : assetUrl;

    const rootRef = adminDb.collection('users').doc(userId).collection('drive').doc('root');
    
    const rootSnap = await rootRef.get();
    if (!rootSnap.exists) {
      await rootRef.set({ createdAt: new Date().toISOString() });
    }

    const fileRef = rootRef.collection('files').doc(task.id);
    const now = new Date().toISOString();

    await fileRef.set({
      id: task.id,
      fileName: task.file.name,
      fileSize: task.file.size,
      contentType: task.file.type,
      type: detectFileType(task.file.type),
      storageKey: task.key,
      thumbKey: task.thumbKey || null,
      url: assetUrl,
      thumbUrl: thumbUrl,
      folderId: folderId || null,
      uploadedAt: now,
      isFavorite: false,
      sourceDriveFileId: null,
    });

    if (folderId) {
      try {
        const folderRef = rootRef.collection('folders').doc(folderId);
        const folderSnap = await folderRef.get();
        if (folderSnap.exists) {
          const currentCount = folderSnap.data()?.fileCount || 0;
          await folderRef.update({
            fileCount: currentCount + 1,
            updatedAt: now,
          });
        }
      } catch (e: any) {
        console.error('[DRIVE_COMPLETE_UPLOAD] Folder update failed:', e.message);
      }
    }

    return { success: true, fileId: task.id };
  } catch (error: any) {
    console.error('[DRIVE_COMPLETE_UPLOAD] ERROR:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ REFRESH URLs
 */
export async function refreshDriveUrls(keys: string[]): Promise<{
  success: boolean;
  urls: Record<string, string>;
  error?: string;
}> {
  try {
    if (!keys || keys.length === 0) return { success: true, urls: {} };
    if (keys.length > 300) return { success: false, urls: {}, error: 'Max 300 keys' };

    const results = await Promise.all(
      keys.map(async (key) => {
        try {
          const url = await storage.getSignedUrl(key, 604800);
          return { key, url };
        } catch {
          return { key, url: '' };
        }
      })
    );

    const urlMap: Record<string, string> = {};
    results.forEach(r => {
      if (r.url) urlMap[r.key] = r.url;
    });

    return { success: true, urls: urlMap };
  } catch (error: any) {
    return { success: false, urls: {}, error: error.message };
  }
}

/**
 * ✅ DELETE FILE (Robust)
 */
export async function deleteDriveFile({
  userId,
  fileId,
}: {
  userId: string;
  fileId: string;
}) {
  console.log('[DRIVE_DELETE_FILE] start:', { userId, fileId });
  
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const rootRef = adminDb.collection('users').doc(userId).collection('drive').doc('root');
    const fileRef = rootRef.collection('files').doc(fileId);
    const fileSnap = await fileRef.get();
    
    if (!fileSnap.exists) {
      return { success: true };
    }

    const data = fileSnap.data() || {};
    const keysToDelete: string[] = [];
    if (data.storageKey) keysToDelete.push(data.storageKey);
    if (data.thumbKey) keysToDelete.push(data.thumbKey);
    const folderId = data.folderId;

    await fileRef.delete();

    if (folderId) {
      try {
        const folderRef = rootRef.collection('folders').doc(folderId);
        const folderSnap = await folderRef.get();
        if (folderSnap.exists) {
          const currentCount = folderSnap.data()?.fileCount || 0;
          await folderRef.update({
            fileCount: Math.max(currentCount - 1, 0),
          });
        }
      } catch (e: any) {
        console.error('[DRIVE_DELETE_FILE] Folder update failed:', e.message);
      }
    }

    for (const key of keysToDelete) {
      try {
        await storage.deleteFile(key);
      } catch (e: any) {
        console.error('[R2_DELETE_FILE]', key, e.message);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[DRIVE_DELETE_FILE] ERROR:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ R2 CLEANUP ONLY (background — fire and forget)
 */
export async function cleanupDriveR2Files({
  userId,
  keys,
}: {
  userId: string;
  keys: string[];
}) {
  if (!storage) return { success: false };
  
  let deleted = 0;
  for (const key of keys) {
    try {
      await storage.deleteFile(key);
      deleted++;
      console.log('[R2_CLEANUP] ✅ Deleted:', key);
    } catch (e: any) {
      console.error('[R2_CLEANUP] ⚠️ Failed:', key, e.message);
    }
  }
  return { success: true, deleted };
}

/**
 * ✅ STORAGE STATS — OPTIMIZED (no photo subcollection reads)
 * Uses gallery.photoCount instead of reading all photos
 */
export async function getDriveStorageStats(userId: string): Promise<{
  usedGb: number;
  totalGb: number;
  driveUsedGb: number;
  galleryUsedGb: number;
  planName: string;
}> {
  if (!adminDb) {
    return { usedGb: 0, totalGb: 0, driveUsedGb: 0, galleryUsedGb: 0, planName: 'None' };
  }

  try {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const rawData = userSnap.data() || {};

    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
    } catch {}

    const plan = getUserPlan(rawData.planId, authEmail);
    const totalGb = plan.storageGb || 0;

    // ✅ Drive files — only 1 query for all files
    const driveFilesSnap = await adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root')
      .collection('files').get();

    let driveBytes = 0;
    driveFilesSnap.docs.forEach(doc => {
      const data = doc.data();
      driveBytes += Number(data.fileSize) || 0;
    });

    // ✅ Gallery usage — photoCount se estimate (NO photo reads!)
    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', userId)
      .get();

    let galleryBytes = 0;
    galleriesSnap.docs.forEach(gDoc => {
      const data = gDoc.data();
      // Average 6.5 MB per photo (preview + original + thumb)
      const photoCount = Number(data.photoCount) || 0;
      galleryBytes += photoCount * 6.5 * 1024 * 1024;
    });

    const driveUsedGb = driveBytes / (1024 ** 3);
    const galleryUsedGb = galleryBytes / (1024 ** 3);
    const totalUsedGb = driveUsedGb + galleryUsedGb;

    return {
      usedGb: totalUsedGb,
      totalGb,
      driveUsedGb,
      galleryUsedGb,
      planName: plan.name || 'None',
    };
  } catch (error: any) {
    console.error('[DRIVE_STATS] ERROR:', error);
    return { usedGb: 0, totalGb: 0, driveUsedGb: 0, galleryUsedGb: 0, planName: 'None' };
  }
}

/**
 * ✅ CREATE GALLERY FROM DRIVE FILES
 */
export async function createGalleryFromDriveFiles({
  userId,
  fileIds,
  galleryName,
  clientName = 'Client',
  category = 'Wedding',
}: {
  userId: string;
  fileIds: string[];
  galleryName: string;
  clientName?: string;
  category?: string;
}) {
  if (!adminDb) return { success: false, error: 'DB offline' };
  if (fileIds.length === 0) return { success: false, error: 'No files selected' };

  try {
    const rootRef = adminDb.collection('users').doc(userId).collection('drive').doc('root');

    const fileDocs = await Promise.all(
      fileIds.map(id => rootRef.collection('files').doc(id).get())
    );

    const files = fileDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

    if (files.length === 0) return { success: false, error: 'Files not found' };

    const galleryRef = adminDb.collection('galleries').doc();
    const now = new Date().toISOString();
    const slug = galleryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 7);

    await galleryRef.set({
      id: galleryRef.id,
      title: galleryName,
      clientName: clientName,
      category: category,
      slug: slug,
      userId: userId,
      isPublic: true,
      isPaid: false,
      isLocked: true,
      photoCount: files.length,
      createdAt: now,
      updatedAt: now,
      coverImage: null,
      driveGallery: true,
    });

    const photosRef = galleryRef.collection('photos');
    let order = Date.now();

    for (const file of files) {
      const photoRef = photosRef.doc(file.id);
      const assetUrl = await storage.getSignedUrl(file.storageKey, 604800);
      const thumbUrl = file.thumbKey
        ? await storage.getSignedUrl(file.thumbKey, 604800)
        : assetUrl;

      await photoRef.set({
        id: file.id,
        url: assetUrl,
        masterUrl: assetUrl,
        thumbUrl: thumbUrl,
        thumbKey: file.thumbKey || null,
        storageKey: file.storageKey,
        previewKey: file.storageKey,
        originalKey: file.storageKey,
        originalUrl: assetUrl,
        originalReady: true,
        originalSize: file.fileSize,
        fileName: file.fileName,
        fileSize: file.fileSize,
        contentType: file.contentType,
        isFavorite: false,
        order: order++,
        uploadedAt: now,
        sourceDriveFileId: file.id,
      });
    }

    return {
      success: true,
      galleryId: galleryRef.id,
      slug: slug,
    };
  } catch (error: any) {
    console.error('[CREATE_GALLERY_FROM_DRIVE] ERROR:', error);
    return { success: false, error: error.message };
  }
}