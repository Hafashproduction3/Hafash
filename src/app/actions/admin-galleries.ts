'use server';

import { adminDb } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';

// ═══════════════════════════════════════════════════════════════
// 1. ADMIN DELETE (With Audit Log)
// ═══════════════════════════════════════════════════════════════
export async function deleteGalleryAsAdmin(
  adminUid: string,
  galleryId: string
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const gallerySnap = await galleryRef.get();
    
    if (!gallerySnap.exists) {
      return { success: false, error: 'Gallery not found' };
    }

    const galleryData = gallerySnap.data();

    // 1. Fetch photos to delete from R2
    const photosSnap = await galleryRef.collection('photos').get();
    const storageKeys: string[] = [];
    
    photosSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.storageKey) storageKeys.push(data.storageKey);
      if (data.thumbKey) storageKeys.push(data.thumbKey);
      if (data.originalKey) storageKeys.push(data.originalKey);
    });

    // 2. Delete photos from Firestore
    const batch = adminDb.batch();
    photosSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 3. Delete from R2
    for (const key of storageKeys) {
      try { 
        await storage.deleteFile(key); 
      } catch (e) { 
        console.error('R2 delete failed', key); 
      }
    }

    // 4. Delete gallery document
    await galleryRef.delete();

    // 5. Add Audit Log
    await adminDb.collection('admin_logs').add({
      adminId: adminUid,
      action: 'gallery_deleted',
      targetType: 'gallery',
      targetId: galleryId,
      targetEmail: galleryData?.title || 'Unknown',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[ADMIN_DELETE_GALLERY]', error);
    return { success: false, error: error.message };
  }
}


// ═══════════════════════════════════════════════════════════════
// 2. USER DELETE (Photographer apni gallery delete kare)
// ═══════════════════════════════════════════════════════════════
export async function deleteGalleryAndAssets(
  userId: string,
  galleryId: string
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const galleryRef = adminDb.collection('galleries').doc(galleryId);
    const gallerySnap = await galleryRef.get();

    if (!gallerySnap.exists) {
      return { success: false, error: 'Gallery not found' };
    }

    const galleryData = gallerySnap.data();

    // ✅ Security: Check karein ke gallery isi user ki hai
    if (galleryData?.userId !== userId) {
      return { success: false, error: 'Unauthorized: You do not own this gallery' };
    }

    // 1. Collect storage keys
    const photosSnap = await galleryRef.collection('photos').get();
    const storageKeys: string[] = [];

    photosSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.storageKey) storageKeys.push(data.storageKey);
      if (data.thumbKey) storageKeys.push(data.thumbKey);
      if (data.originalKey) storageKeys.push(data.originalKey);
    });

    // 2. Delete photos from Firestore
    const batch = adminDb.batch();
    photosSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 3. Delete files from R2 Storage
    for (const key of storageKeys) {
      try {
        await storage.deleteFile(key);
      } catch (e) {
        console.error(`[R2_DELETE_FAIL] ${key}`, e);
      }
    }

    // 4. Delete gallery document
    await galleryRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_GALLERY_AND_ASSETS]', error);
    return { success: false, error: error.message };
  }
}