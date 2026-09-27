/**
 * Hafash Subscription Plan Definitions
 * Now includes Hafash Drive
 */

export type PlanId = 'starter' | 'pro' | 'business' | 'enterprise';

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
  driveEnabled: boolean;
  maxFolderDepth: number;
  maxFileSizeGb: number;
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    storageGb: 20,
    zipLimitGb: 999,
    price: 'Rs. 499',
    priceAmount: 499,
    features: [
      '20GB Hafash Drive',
      'Unlimited Galleries',
      'Download All Originals',
      'Standard Processing',
    ],
    priorityLevel: 1,
    priorityLabel: 'Standard',
    driveEnabled: true,
    maxFolderDepth: 3,
    maxFileSizeGb: 2,
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    storageGb: 50,
    zipLimitGb: 999,
    price: 'Rs. 999',
    priceAmount: 999,
    features: [
      '50GB Hafash Drive',
      'Unlimited Galleries',
      'Download All Originals',
      'Priority Processing',
      'Custom Branding',
    ],
    priorityLevel: 2,
    priorityLabel: 'High Priority',
    driveEnabled: true,
    maxFolderDepth: 5,
    maxFileSizeGb: 5,
  },
  business: {
    id: 'business',
    name: 'Studio',
    storageGb: 100,
    zipLimitGb: 999,
    price: 'Rs. 1,800',
    priceAmount: 1800,
    features: [
      '100GB Hafash Drive',
      'Unlimited Galleries',
      'Download All Originals',
      'Premium Processing',
      'Custom Branding',
      'Advanced Analytics (Future)',
    ],
    priorityLevel: 3,
    priorityLabel: 'Premium',
    driveEnabled: true,
    maxFolderDepth: 8,
    maxFileSizeGb: 10,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    storageGb: 250,
    zipLimitGb: 9999,
    price: 'Rs. 3,500',
    priceAmount: 3500,
    features: [
      '250GB Hafash Drive',
      'Unlimited Galleries',
      'Download All Originals',
      'Dedicated Processing',
      'Custom Branding',
      'Advanced Analytics (Future)',
      'Priority Support',
    ],
    priorityLevel: 4,
    priorityLabel: 'Enterprise',
    driveEnabled: true,
    maxFolderDepth: 15,
    maxFileSizeGb: 25,
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
  driveEnabled: false,
  maxFolderDepth: 0,
  maxFileSizeGb: 0,
};

export const DEFAULT_PLAN = NO_PLAN;

export const OWNER_EMAILS: string[] = [
  'hafashgroup60@gmail.com',
];

export const OWNER_PLAN: HafashPlan = {
  id: 'enterprise',
  name: 'Owner (Unlimited)',
  storageGb: 999999,
  zipLimitGb: 999999,
  price: 'Rs. 0',
  priceAmount: 0,
  features: [
    'Unlimited Storage',
    'Unlimited Drive',
    'All Features Unlocked',
    'Custom Branding',
    'Priority Processing',
    'Owner Account',
  ],
  priorityLevel: 999,
  priorityLabel: 'Owner',
  driveEnabled: true,
  maxFolderDepth: 999,
  maxFileSizeGb: 999,
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
 */
export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;

  let totalBytes = 0;

  galleries.forEach(g => {
    if ((!g.items || g.items.length === 0) && g.photoCount > 0) {
      totalBytes += g.photoCount * 6.5 * 1024 * 1024;
      return;
    }

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

/**
 * Hafash Drive ke saath total usage
 */
export function calculateTotalUsageGb(
  galleries: any[] | null,
  driveItems: any[] | null
): number {
  const galleryUsage = calculateUsageGb(galleries);
  
  if (!driveItems || !Array.isArray(driveItems)) return galleryUsage;
  
  let driveBytes = 0;
  driveItems.forEach(item => {
    driveBytes += Number(item.fileSize) || 0;
  });
  
  return galleryUsage + (driveBytes / (1024 * 1024 * 1024));
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