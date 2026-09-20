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

/**
 * SERVICE: Calculate comprehensive storage telemetry for a user.
 * ✅ Owner bypass: owner ko unlimited storage milta hai.
 */
export async function getStorageStats(userId: string): Promise<StorageStats> {
  console.log(`[DEBUG] getStorageStats: Starting for user ${userId}`);
  
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

    console.log(`[DEBUG] getStorageStats: Plan = ${plan.name} (${plan.storageGb}GB) | Owner: ${isOwner}`);

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
        // ✅ Preview + Thumb + Original count
        const previewSize = Number(item.fileSize) || 0;
        const thumbSize = item.thumbKey ? (50 * 1024) : 0;
        let originalSize = 0;
        if (item.originalReady) {
          originalSize = Number(item.originalSize) > 0 
            ? Number(item.originalSize) 
            : previewSize * 10;
        }
        const itemTotal = previewSize + thumbSize + originalSize;
        totalBytes += itemTotal > 0 ? itemTotal : (3 * 1024 * 1024);
      });
    });

    const usedGb = totalBytes / (1024 * 1024 * 1024);

    console.log(`[DEBUG] Storage: ${usedGb.toFixed(4)} GB across ${totalFiles} assets`);

    return {
      usedBytes: totalBytes,
      usedGb: usedGb,
      totalGb: plan.storageGb,
      remainingGb: Math.max(plan.storageGb - usedGb, 0),
      fileCount: totalFiles,
      galleryCount: galleriesSnap.size,
      planName: plan.name,
      isOverQuota: !isOwner && usedGb >= plan.storageGb,
    };
  } catch (error: any) {
    console.error("[DEBUG] CRITICAL ERROR IN getStorageStats:", error);
    throw error;
  }
}