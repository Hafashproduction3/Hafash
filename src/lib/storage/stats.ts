'use server';

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
 * 
 * Hardened for production: iterates actual file sizes to ensure 
 * quota precision.
 */
export async function getStorageStats(userId: string): Promise<StorageStats> {
  if (!adminDb) throw new Error("Database offline.");

  // 1. Fetch User Plan
  const userSnap = await adminDb.collection('users').doc(userId).get();
  const userData = userSnap.data();
  const planId = (userData?.planId as PlanId) || 'starter';
  const plan = HAFASH_PLANS[planId] || DEFAULT_PLAN;

  // 2. Fetch All Galleries
  const galleriesSnap = await adminDb.collection('galleries')
    .where('userId', '==', userId)
    .get();

  let totalBytes = 0;
  let totalFiles = 0;

  galleriesSnap.docs.forEach(doc => {
    const data = doc.data();
    const items = data.items || [];
    totalFiles += items.length;
    
    items.forEach((item: any) => {
      // Sum actual fileSize if present, fallback to estimation (8MB) if missing
      // Safeguard against non-numeric values
      const size = Number(item.fileSize);
      totalBytes += isNaN(size) ? (8 * 1024 * 1024) : size;
    });
  });

  const usedGb = totalBytes / (1024 * 1024 * 1024);

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
}
