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
    zipLimitGb: 999, // effectively unlimited for V1
    price: 'Rs. 2,500',
    features: ['50GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Standard Processing'],
    priorityLevel: 1,
    priorityLabel: 'Standard',
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    storageGb: 100,
    zipLimitGb: 999,
    price: 'Rs. 5,000',
    features: ['100GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Priority Processing', 'Custom Branding'],
    priorityLevel: 2,
    priorityLabel: 'High Priority',
  },
  business: {
    id: 'business',
    name: 'Studio',
    storageGb: 250,
    zipLimitGb: 999,
    price: 'Rs. 10,000',
    features: ['250GB Cloud Storage', 'Unlimited Galleries', 'Download All Originals', 'Premium Processing', 'Custom Branding', 'Advanced Analytics (Future)'],
    priorityLevel: 3,
    priorityLabel: 'Premium',
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
