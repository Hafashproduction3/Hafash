import { adminDb } from '@/lib/firebase-admin';
import { getShardedStorage, migrateUserStorageShards } from './counters';
import {
  HAFASH_PLANS,
  type PlanId,
  DEFAULT_PLAN,
  isOwnerEmail,
  OWNER_PLAN,
} from '@/lib/plans';

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

const storageStatsCache = new Map<
  string,
  { data: StorageStats; expires: number }
>();
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getStorageStats(userId: string): Promise<StorageStats> {
  const cached = storageStatsCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  if (!adminDb) throw new Error('Database offline.');

  try {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data() || {};

    // ✅ admin.auth().getUser() call HATA DIYA — Firestore email hi kaafi
    const email = userData?.email || null;
    const isOwner = isOwnerEmail(email);
    const planId = (userData?.planId as PlanId) || 'starter';
    const plan = isOwner ? OWNER_PLAN : HAFASH_PLANS[planId] || DEFAULT_PLAN;

    const hasCustomStorage =
      userData.customStorageLimitGb !== undefined &&
      userData.customStorageLimitGb !== null;

    const baseStorageGb = isOwner
      ? plan.storageGb
      : hasCustomStorage
        ? Number(userData.customStorageLimitGb)
        : plan.storageGb;

    const activeReferrals = Number(userData.activeReferrals) || 0;
    const bonusStorageGb = activeReferrals * 10;
    const totalGb = baseStorageGb + bonusStorageGb;

    // ✅ Sharded counters — 10 reads O(1), 0 photo scan
    let stats = await getShardedStorage(userId);

    // 🟡 One-time migration
    const hasMigrated = userData.storageMigratedAt !== undefined;
    if (!hasMigrated && stats.bytes === 0 && stats.files === 0) {
      stats = await migrateUserStorageShards(userId);
    }

    const usedGb = stats.bytes / (1024 * 1024 * 1024);

    const result: StorageStats = {
      usedBytes: stats.bytes,
      usedGb,
      totalGb,
      remainingGb: Math.max(totalGb - usedGb, 0),
      fileCount: stats.files,
      galleryCount: Number(userData.galleryCount) || 0,
      planName:
        hasCustomStorage && !isOwner
          ? `Custom (${totalGb}GB)`
          : activeReferrals > 0
            ? `${plan.name} + ${bonusStorageGb}GB Bonus`
            : plan.name,
      isOverQuota: !isOwner && usedGb >= totalGb,
    };

    storageStatsCache.set(userId, {
      data: result,
      expires: Date.now() + STATS_CACHE_TTL,
    });

    return result;
  } catch (error: unknown) {
    console.error(
      '[DEBUG] CRITICAL ERROR IN getStorageStats:',
      error
    );
    throw error;
  }
}

export function clearStorageStatsCache(userId: string): void {
  storageStatsCache.delete(userId);
}