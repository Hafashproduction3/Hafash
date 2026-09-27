'use server';
import { getSubscriptionInfo } from '@/lib/subscription/status';
import { adminDb, admin } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';

const R2_PUBLIC_URL = 'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

function getPublicUrl(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `${R2_PUBLIC_URL}/${key}`;
}

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
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const folderRef = adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root')
      .collection('folders').doc();

    const now = new Date().toISOString();

    await folderRef.set({
      id: folderRef.id,
      name: name.trim(),
      parentId: parentId || null,
      fileCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, folderId: folderRef.id };
  } catch (error: any) {
    console.error('[DRIVE_CREATE_FOLDER]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ DELETE FOLDER (with all files inside)
 */
export async function deleteDriveFolder({
  userId,
  folderId,
}: {
  userId: string;
  folderId: string;
}) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const driveRef = adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root');

    // Get all files in this folder
    const filesSnap = await driveRef
      .collection('files')
      .where('folderId', '==', folderId)
      .get();

    // Delete from R2
    const keysToDelete: string[] = [];
    filesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.storageKey) keysToDelete.push(data.storageKey);
      if (data.thumbKey) keysToDelete.push(data.thumbKey);
    });

    // Delete folder document
    await driveRef.collection('folders').doc(folderId).delete();

    // Delete all files from Firestore
    const deletePromises = filesSnap.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    // Delete from R2 (background)
    if (keysToDelete.length > 0) {
      storage.deleteFiles(keysToDelete).catch(e => console.error('[R2_DELETE]', e));
    }

    return { success: true, deletedFiles: filesSnap.size };
  } catch (error: any) {
    console.error('[DRIVE_DELETE_FOLDER]', error);
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
    return { success: false, error: error.message };
  }
}

/**
 * ✅ REQUEST UPLOAD URL (Drive)
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

    const userData = {
      ...rawData,
      email: rawData.email || authEmail,
      userEmail: rawData.userEmail || authEmail,
      photographerEmail: rawData.photographerEmail || authEmail,
    };

    const subscription = getSubscriptionInfo(userData);
    if (subscription.state !== 'active') {
      return { success: false, error: 'Subscription inactive. Please renew.' };
    }

    // ✅ Check total storage (drive + gallery)
    const storageStats = await getDriveStorageStats(userId);
    const incomingGb = fileSize / (1024 * 1024 * 1024);

    if ((storageStats.usedGb + incomingGb) > storageStats.totalGb) {
      return {
        success: false,
        error: `Storage full. Used ${storageStats.usedGb.toFixed(2)}GB of ${storageStats.totalGb}GB.`,
      };
    }

    const fileId = crypto.randomUUID();
    const extension = fileName.split('.').pop();
    const storageKey = `drive/${userId}/${folderId || 'root'}/${fileId}.${extension}`;

    const uploadUrl = await storage.getSignedUploadUrl(storageKey, contentType, 300);

    return { success: true, uploadUrl, key: storageKey, fileId };
  } catch (error: any) {
    console.error('[DRIVE_UPLOAD_URL]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ COMPLETE UPLOAD (Drive)
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
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const exists = await storage.fileExists(task.key);
    if (!exists) return { success: false, error: 'File not in R2' };

    // ✅ 7-day signed URLs (R2 max)
    const assetUrl = await storage.getSignedUrl(task.key, 604800);
    const thumbUrl = task.thumbKey
      ? await storage.getSignedUrl(task.thumbKey, 604800)
      : assetUrl;

    const driveRef = adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root');

    const fileRef = driveRef.collection('files').doc(task.id);

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
      sourceDriveFileId: null, // ← Yeh Drive ki original file hai
    });

    // ✅ Update folder fileCount
    if (folderId) {
      const folderRef = driveRef.collection('folders').doc(folderId);
      const folderSnap = await folderRef.get();
      const currentCount = folderSnap.data()?.fileCount || 0;
      await folderRef.update({
        fileCount: currentCount + 1,
        updatedAt: now,
      });
    }

    return { success: true, fileId: task.id };
  } catch (error: any) {
    console.error('[DRIVE_COMPLETE_UPLOAD]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ REFRESH DRIVE URLs (7-day issue fix)
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
 * ✅ DELETE FILE (Drive)
 */
export async function deleteDriveFile({
  userId,
  fileId,
}: {
  userId: string;
  fileId: string;
}) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const driveRef = adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root');

    const fileRef = driveRef.collection('files').doc(fileId);
    const fileSnap = await fileRef.get();
    if (!fileSnap.exists) return { success: false, error: 'File not found' };

    const data = fileSnap.data()!;
    const keysToDelete: string[] = [];
    if (data.storageKey) keysToDelete.push(data.storageKey);
    if (data.thumbKey) keysToDelete.push(data.thumbKey);

    await fileRef.delete();

    // Update folder count
    if (data.folderId) {
      const folderRef = driveRef.collection('folders').doc(data.folderId);
      const folderSnap = await folderRef.get();
      const currentCount = folderSnap.data()?.fileCount || 0;
      await folderRef.update({
        fileCount: Math.max(currentCount - 1, 0),
        updatedAt: new Date().toISOString(),
      });
    }

    // R2 delete (background)
    if (keysToDelete.length > 0) {
      storage.deleteFiles(keysToDelete).catch(e => console.error('[R2]', e));
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ✅ GET STORAGE STATS (Drive + Gallery combined, accurate)
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

    const userData = {
      ...rawData,
      email: rawData.email || authEmail,
      userEmail: rawData.userEmail || authEmail,
      photographerEmail: rawData.photographerEmail || authEmail,
    };

    const subscription = getSubscriptionInfo(userData);
    const totalGb = subscription.storageGb || 0;

    // ✅ Drive files
    const driveFilesSnap = await adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root')
      .collection('files').get();

    let driveBytes = 0;
    const driveStorageKeys = new Set<string>();

    driveFilesSnap.docs.forEach(doc => {
      const data = doc.data();
      driveBytes += Number(data.fileSize) || 0;
      if (data.storageKey) driveStorageKeys.add(data.storageKey);
    });

    // ✅ Gallery files (sirf woh jo Drive se NAHI aayi)
    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', userId)
      .get();

    let galleryOnlyBytes = 0;

    for (const galleryDoc of galleriesSnap.docs) {
      const photosSnap = await galleryDoc.ref.collection('photos').get();
      photosSnap.docs.forEach(pDoc => {
        const data = pDoc.data();
        const storageKey = data.storageKey;

        // ✅ Agar file Drive mein bhi hai → skip karo (duplicate count nahi)
        if (storageKey && driveStorageKeys.has(storageKey)) return;

        galleryOnlyBytes += Number(data.fileSize) || 0;
      });
    }

    const driveUsedGb = driveBytes / (1024 ** 3);
    const galleryUsedGb = galleryOnlyBytes / (1024 ** 3);
    const totalUsedGb = driveUsedGb + galleryUsedGb;

    return {
      usedGb: totalUsedGb,
      totalGb,
      driveUsedGb,
      galleryUsedGb,
      planName: subscription.planName || 'None',
    };
  } catch (error: any) {
    console.error('[DRIVE_STATS]', error);
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
    // Get file documents
    const driveRef = adminDb
      .collection('users').doc(userId)
      .collection('drive').doc('root');

    const fileDocs = await Promise.all(
      fileIds.map(id => driveRef.collection('files').doc(id).get())
    );

    const files = fileDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

    if (files.length === 0) return { success: false, error: 'Files not found' };

    // Create gallery document
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
      driveGallery: true, // ← Mark ke yeh Drive se bani hai
    });

    // ✅ Add photos to gallery (reference — no new storage)
    const photosRef = galleryRef.collection('photos');
    let order = Date.now();

    for (const file of files) {
      const photoRef = photosRef.doc(file.id); // Same ID as drive file
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
        storageKey: file.storageKey,           // ← Same storage key
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
        sourceDriveFileId: file.id, // ← Yeh drive se aayi hai
      });
    }

    return {
      success: true,
      galleryId: galleryRef.id,
      slug: slug,
    };
  } catch (error: any) {
    console.error('[CREATE_GALLERY_FROM_DRIVE]', error);
    return { success: false, error: error.message };
  }
}