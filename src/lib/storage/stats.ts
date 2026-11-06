import { admin, adminDb } from '@/lib/firebase-admin';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN, isOwnerEmail, OWNER_PLAN } from '@/lib/plans';

export interface StorageStats {
  usedBytes: number;
  usedGb: number;
  totalGb: number;
  remainingGb: number;
  fileCount: number;
  galleryCount: number;
  planName: string;
  isOverQuota: boolean;
}

const storageStatsCache = new Map<string, { data: StorageStats; expires: number }>();
const STATS_CACHE_TTL = 60 * 1000;

export async function getStorageStats(userId: string): Promise<StorageStats> {
  const cached = storageStatsCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  if (!adminDb) throw new Error("Database offline.");

  try {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data() || {};

    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
    } catch (e: any) {}

    const email = userData?.email || authEmail;
    const isOwner = isOwnerEmail(email);
    const planId = (userData?.planId as PlanId) || 'starter';
    const plan = isOwner ? OWNER_PLAN : (HAFASH_PLANS[planId] || DEFAULT_PLAN);

    // ✅ CUSTOM STORAGE
    const hasCustomStorage = userData.customStorageLimitGb !== undefined && userData.customStorageLimitGb !== null;
    const totalGb = isOwner ? plan.storageGb : (hasCustomStorage ? Number(userData.customStorageLimitGb) : plan.storageGb);

    const galleriesSnap = await adminDb.collection('galleries').where('userId', '==', userId).get();
    let totalBytes = 0;
    let totalFiles = 0;

    const photosPromises = galleriesSnap.docs.map(async (galleryDoc) => {
      try {
        const photosSnap = await adminDb!.collection('galleries').doc(galleryDoc.id).collection('photos').get();
        photosSnap.docs.forEach((photoDoc) => {
          const photo = photoDoc.data();
          const originalSize = Number(photo.originalSize) || 0;
          const previewSize = Number(photo.fileSize) || 0;
          const actualSize = originalSize > 0 ? originalSize : previewSize;
          totalBytes += actualSize > 0 ? actualSize : (5 * 1024 * 1024);
          totalFiles++;
        });
      } catch (err) {}
    });

    await Promise.all(photosPromises);
    const usedGb = totalBytes / (1024 * 1024 * 1024);

    const result: StorageStats = {
      usedBytes: totalBytes,
      usedGb: usedGb,
      totalGb: totalGb,
      remainingGb: Math.max(totalGb - usedGb, 0),
      fileCount: totalFiles,
      galleryCount: galleriesSnap.size,
      planName: hasCustomStorage && !isOwner ? `Custom (${totalGb}GB)` : plan.name,
      isOverQuota: !isOwner && usedGb >= totalGb,
    };

    storageStatsCache.set(userId, { data: result, expires: Date.now() + STATS_CACHE_TTL });
    return result;
  } catch (error: any) {
    console.error("[DEBUG] CRITICAL ERROR IN getStorageStats:", error);
    throw error;
  }
}

export function clearStorageStatsCache(userId: string): void {
  storageStatsCache.delete(userId);
}