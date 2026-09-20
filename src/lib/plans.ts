/**
 * Hafash Subscription Plan Definitions
 * Centralized configuration for storage, delivery limits, and processing priority.
 */

export type PlanId = 'starter' | 'pro' | 'business';

export interface HafashPlan {
  id: PlanId | 'none';
  name: string;
  storageGb: number;
  zipLimitGb: number;
  price: string;
  priceAmount: number;
  features: string[];
  priorityLevel: number;
  priorityLabel: string;
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    storageGb: 50,
    zipLimitGb: 999,
    price: 'Rs. 1,200',
    priceAmount: 1200,
    features: ['50GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Standard Processing'],
    priorityLevel: 1,
    priorityLabel: 'Standard',
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    storageGb: 100,
    zipLimitGb: 999,
    price: 'Rs. 1,999',
    priceAmount: 1999,
    features: ['100GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Priority Processing', 'Custom Branding'],
    priorityLevel: 2,
    priorityLabel: 'High Priority',
  },
  business: {
    id: 'business',
    name: 'Studio',
    storageGb: 250,
    zipLimitGb: 999,
    price: 'Rs. 3,500',
    priceAmount: 3500,
    features: ['250GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Premium Processing', 'Custom Branding', 'Advanced Analytics (Future)'],
    priorityLevel: 3,
    priorityLabel: 'Premium',
  },
};

// Represents a user who has NOT paid for any plan yet.
export const NO_PLAN: HafashPlan = {
  id: 'none',
  name: 'No Active Plan',
  storageGb: 0,
  zipLimitGb: 0,
  price: 'Rs. 0',
  priceAmount: 0,
  features: [],
  priorityLevel: 0,
  priorityLabel: 'None',
};

export const DEFAULT_PLAN = NO_PLAN;

// ─────────────────────────────────────────────────────────────
// 👑 OWNER BYPASS — Unlimited plan for the Hafash owner account
// ─────────────────────────────────────────────────────────────
export const OWNER_EMAILS: string[] = [
  'hafashgroup60@gmail.com',
];

export const OWNER_PLAN: HafashPlan = {
  id: 'business',
  name: 'Owner (Unlimited)',
  storageGb: 999999,
  zipLimitGb: 999999,
  price: 'Rs. 0',
  priceAmount: 0,
  features: [
    'Unlimited Storage',
    'All Features Unlocked',
    'Custom Branding',
    'Priority Processing',
    'Owner Account',
  ],
  priorityLevel: 999,
  priorityLabel: 'Owner',
};

/**
 * Check if an email is the owner.
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Looks up a user's plan safely.
 * - If the user is the owner → OWNER_PLAN (unlimited)
 * - If planId is valid → that plan
 * - Otherwise → NO_PLAN
 */
export function getUserPlan(planId?: string | null, email?: string | null): HafashPlan {
  if (isOwnerEmail(email)) return OWNER_PLAN;
  if (!planId) return NO_PLAN;
  if (planId in HAFASH_PLANS) return HAFASH_PLANS[planId as PlanId];
  return NO_PLAN;
}

/**
 * Calculates total storage usage across all galleries.
 * ✅ Counts: preview + thumbnail + original (if uploaded)
 */
export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;

  let totalBytes = 0;

  galleries.forEach(g => {
    const items = Array.isArray(g.items) ? g.items : [];
    items.forEach((item: any) => {
      // ✅ Preview size (main file)
      const previewSize = Number(item.fileSize) || 0;

      // ✅ Thumbnail size (approx 50 KB if thumbKey exists)
      const thumbSize = item.thumbKey ? (50 * 1024) : 0;

      // ✅ Original size (agar upload hua hai)
      let originalSize = 0;
      if (item.originalReady) {
        if (item.originalSize && Number(item.originalSize) > 0) {
          originalSize = Number(item.originalSize);
        } else {
          // Fallback: agar originalSize missing hai, preview ka 10x assume karo
          originalSize = previewSize * 10;
        }
      }

      // Total per item
      const itemTotal = previewSize + thumbSize + originalSize;

      if (itemTotal > 0) {
        totalBytes += itemTotal;
      } else {
        // Fallback: agar kuch bhi nahi hai toh 3 MB assume
        totalBytes += (3 * 1024 * 1024);
      }
    });
  });

  return totalBytes / (1024 * 1024 * 1024);
}

/**
 * Format bytes into human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate storage usage in MB (for display).
 */
export function calculateUsageMb(galleries: any[] | null): number {
  return calculateUsageGb(galleries) * 1024;
}