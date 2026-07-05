/**
 * Hafash Subscription Plan Definitions
 * Centralized configuration for storage, delivery limits, and processing priority.
 */

export type PlanId = 'starter' | 'pro' | 'business';

export interface HafashPlan {
  id: PlanId;
  name: string;
  storageGb: number;
  zipLimitGb: number;
  price: string;
  features: string[];
  priorityLevel: number; // 1 (Starter), 2 (Pro), 3 (Studio)
  priorityLabel: string;
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    storageGb: 50,
    zipLimitGb: 5,
    price: '$9',
    features: ['Up to 10 Galleries', 'Basic Watermarking', 'Social Sharing', '5GB ZIP Packages'],
    priorityLevel: 1,
    priorityLabel: 'Standard',
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    storageGb: 100,
    zipLimitGb: 15,
    price: '$19',
    features: ['Unlimited Galleries', 'Custom Branding', 'Advanced Analytics', '15GB ZIP Packages'],
    priorityLevel: 2,
    priorityLabel: 'High Priority',
  },
  business: {
    id: 'business',
    name: 'Studio',
    storageGb: 250,
    zipLimitGb: 50,
    price: '$39',
    features: ['All Features', 'Priority Support', 'RAW Storage Add-on', '50GB ZIP Packages'],
    priorityLevel: 3,
    priorityLabel: 'Highest Priority',
  },
};

export const DEFAULT_PLAN = HAFASH_PLANS.starter;

/**
 * Estimates the total size of a collection of items.
 * For MVP, we assume an average high-res photo is 8MB.
 */
export function estimateZipSizeGb(itemCount: number): number {
  const averageSizeMb = 8;
  const totalMb = itemCount * averageSizeMb;
  return totalMb / 1024;
}

/**
 * Calculates total storage usage across all galleries.
 * Returns usage in GB.
 */
export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;
  
  const totalItems = galleries.reduce((acc, g) => {
    const itemCount = Array.isArray(g.items) ? g.items.length : 0;
    return acc + itemCount;
  }, 0);

  if (totalItems === 0) return 0;

  // Assuming an average high-res masterpiece is ~8MB for telemetry estimation
  const averageSizeMb = 8;
  const totalMb = totalItems * averageSizeMb;
  return totalMb / 1024;
}
