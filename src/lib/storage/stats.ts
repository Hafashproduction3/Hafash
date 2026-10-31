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

// ✅ Storage stats cache (60 seconds)
const storageStatsCache = new Map<string, { data: StorageStats; expires: number }>();
const STATS_CACHE_TTL = 60 * 1000;

/**
 * SERVICE: Calculate comprehensive storage telemetry for a user.
 * ✅ Owner bypass: owner ko unlimited storage milta hai.
 * ✅ ASAL SIZE: Har gallery ki photos subcollection se asal size fetch karta hai.
 */
export async function getStorageStats(userId: string): Promise<StorageStats> {
  // ✅ Cache check — agar 60 seconds ke andar call hua, toh cached return karo
  const cached = storageStatsCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  if (!adminDb) {
    throw new Error("Database offline. adminDb is null.");
  }

  try {
    // 1. Fetch User
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data() || {};

    // ✅ Firebase Auth se email fetch karo (owner check)
    let authEmail: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      authEmail = userRecord.email || null;
    } catch (e: any) {
      console.warn("[STATS] Auth email failed:", e.message);
    }

    const email = userData?.email || authEmail;

    // ✅ Owner check
    const isOwner = isOwnerEmail(email);
    const planId = (userData?.planId as PlanId) || 'starter';
    const plan = isOwner 
      ? OWNER_PLAN 
      : (HAFASH_PLANS[planId] || DEFAULT_PLAN);

    // 2. Fetch All Galleries
    const galleriesSnap = await adminDb.collection('galleries')
      .where('userId', '==', userId)
      .get();

    let totalBytes = 0;
    let totalFiles = 0;

    // ✅ ASAL SIZE: Har gallery ki photos subcollection se fetch karein
    const photosPromises = galleriesSnap.docs.map(async (galleryDoc) => {
      try {
        const photosSnap = await adminDb!
          .collection('galleries')
          .doc(galleryDoc.id)
          .collection('photos')
          .get();

        photosSnap.docs.forEach((photoDoc) => {
          const photo = photoDoc.data();
          
          // ✅ Sirf originalSize use karein (jo asal file size hai)
          const originalSize = Number(photo.originalSize) || 0;
          
          // Agar originalSize nahi hai, toh previewSize (fileSize) use karein
          const previewSize = Number(photo.fileSize) || 0;
          
          // Jo bhi available ho, wo use karein
          const actualSize = originalSize > 0 ? originalSize : previewSize;
          
          // Agar dono nahi hain, toh average 5MB maan lo
          totalBytes += actualSize > 0 ? actualSize : (5 * 1024 * 1024);
          totalFiles++;
        });
      } catch (err) {
        console.error(`[STATS] Gallery ${galleryDoc.id} photos fetch failed:`, err);
      }
    });

    await Promise.all(photosPromises);

    const usedGb = totalBytes / (1024 * 1024 * 1024);

    const result: StorageStats = {
      usedBytes: totalBytes,
      usedGb: usedGb,
      totalGb: plan.storageGb,
      remainingGb: Math.max(plan.storageGb - usedGb, 0),
      fileCount: totalFiles,
      galleryCount: galleriesSnap.size,
      planName: plan.name,
      isOverQuota: !isOwner && usedGb >= plan.storageGb,
    };

    // ✅ Cache mein save karo
    storageStatsCache.set(userId, {
      data: result,
      expires: Date.now() + STATS_CACHE_TTL,
    });

    return result;
  } catch (error: any) {
    console.error("[DEBUG] CRITICAL ERROR IN getStorageStats:", error);
    throw error;
  }
}

/**
 * ✅ Cache manually clear karein (upload ke baad, plan change ke baad)
 */
export function clearStorageStatsCache(userId: string): void {
  storageStatsCache.delete(userId);
}