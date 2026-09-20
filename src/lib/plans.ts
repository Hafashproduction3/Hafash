/**
 * Hafash Subscription Plan Definitions
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

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
}

export function getUserPlan(planId?: string | null, email?: string | null): HafashPlan {
  if (isOwnerEmail(email)) return OWNER_PLAN;
  if (!planId) return NO_PLAN;
  if (planId in HAFASH_PLANS) return HAFASH_PLANS[planId as PlanId];
  return NO_PLAN;
}

/**
 * Calculates total storage usage across all galleries.
 * ✅ Supports subcollection photoCount + legacy items array
 */
export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;

  let totalBytes = 0;

  galleries.forEach(g => {
    // ✅ If subcollection migrated (items empty but photoCount exists)
    if ((!g.items || g.items.length === 0) && g.photoCount > 0) {
      // Estimate: 2.5 MB preview + 4 MB original = 6.5 MB per photo
      totalBytes += g.photoCount * 6.5 * 1024 * 1024;
      return;
    }

    // Legacy: items array
    const items = Array.isArray(g.items) ? g.items : [];
    items.forEach((item: any) => {
      const previewSize = Number(item.fileSize) || 0;
      const thumbSize = item.thumbKey ? (50 * 1024) : 0;
      let originalSize = 0;
      if (item.originalReady) {
        if (item.originalSize && Number(item.originalSize) > 0) {
          originalSize = Number(item.originalSize);
        } else {
          originalSize = previewSize * 10;
        }
      }
      const itemTotal = previewSize + thumbSize + originalSize;
      totalBytes += itemTotal > 0 ? itemTotal : (3 * 1024 * 1024);
    });
  });

  return totalBytes / (1024 * 1024 * 1024);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function calculateUsageMb(galleries: any[] | null): number {
  return calculateUsageGb(galleries) * 1024;
}