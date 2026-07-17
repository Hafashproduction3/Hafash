import { storage } from './storage';
import { adminDb } from '@/lib/firebase-admin';

/**
 * ARCHITECTURE: Storage Integrity & Cleanup Framework.
 * 
 * Provides methods to identify and remove unlinked assets from R2.
 */
export class StorageCleanupService {
  
  /**
   * Identifies objects in R2 that have no matching record in Firestore.
   * Scoped per gallery to maintain performance.
   */
  static async findOrphansInGallery(userId: string, galleryId: string) {
    const prefix = `uploads/${userId}/${galleryId}/`;
    const r2Keys = await storage.listFiles(prefix);
    
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) return r2Keys; // Entire gallery deleted, all are orphans

    const galleryData = gallerySnap.data();
    const dbKeys = new Set((galleryData?.items || []).map((i: any) => i.storageKey));

    return r2Keys.filter(key => !dbKeys.has(key));
  }

  /**
   * Removes specific orphan keys.
   */
  static async purgeKeys(keys: string[]) {
    const results = await Promise.allSettled(
      keys.map(key => storage.deleteFile(key))
    );
    
    return {
      total: keys.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }
}
