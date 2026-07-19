import { adminDb } from '@/lib/firebase-admin';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

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

/**
 * SERVICE: Calculate comprehensive storage telemetry for a user.
 */
export async function getStorageStats(userId: string): Promise<StorageStats> {
  console.log(`[DEBUG] getStorageStats: Starting calculation for user ${userId}`);
  
  if (!adminDb) {
    throw new Error("Database offline. adminDb is null.");
  }

  try {
    // 1. Fetch User Plan
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data();
    const planId = (userData?.planId as PlanId) || 'starter';
    const plan = HAFASH_PLANS[planId] || DEFAULT_PLAN;

    console.log(`[DEBUG] getStorageStats: Active Plan is ${plan.name} (${plan.storageGb}GB Limit)`);

    // 2. Fetch All Galleries
    const galleriesSnap = await adminDb.collection('galleries')
      .where('userId', '==', userId)
      .get();

    console.log(`[DEBUG] getStorageStats: Found ${galleriesSnap.size} galleries`);

    let totalBytes = 0;
    let totalFiles = 0;

    galleriesSnap.docs.forEach(doc => {
      const data = doc.data();
      const items = Array.isArray(data.items) ? data.items : [];
      
      totalFiles += items.length;
      
      items.forEach((item: any) => {
        // Real-time summing of actual file sizes
        const size = Number(item.fileSize);
        totalBytes += isNaN(size) ? (8 * 1024 * 1024) : size;
      });
    });

    const usedGb = totalBytes / (1024 * 1024 * 1024);

    console.log(`[DEBUG] Updated storage usage calculation: ${usedGb.toFixed(4)} GB across ${totalFiles} assets`);

    return {
      usedBytes: totalBytes,
      usedGb: usedGb,
      totalGb: plan.storageGb,
      remainingGb: Math.max(plan.storageGb - usedGb, 0),
      fileCount: totalFiles,
      galleryCount: galleriesSnap.size,
      planName: plan.name,
      isOverQuota: usedGb >= plan.storageGb
    };
  } catch (error: any) {
    console.error("[DEBUG] CRITICAL ERROR IN getStorageStats:", error);
    throw error;
  }
}
