/**
 * Hafash Subscription Plan Definitions
 * Centralized configuration for storage and delivery limits.
 */

export type PlanId = 'starter' | 'pro' | 'business';

export interface HafashPlan {
  id: PlanId;
  name: string;
  storageGb: number;
  zipLimitGb: number;
  price: string;
  features: string[];
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    storageGb: 50,
    zipLimitGb: 5,
    price: '$9',
    features: ['Up to 10 Galleries', 'Basic Watermarking', 'Social Sharing', '5GB ZIP Packages'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    storageGb: 200,
    zipLimitGb: 20,
    price: '$24',
    features: ['Unlimited Galleries', 'Custom Branding', 'Advanced Analytics', '20GB ZIP Packages'],
  },
  business: {
    id: 'business',
    name: 'Business',
    storageGb: 500,
    zipLimitGb: 100,
    price: '$49',
    features: ['All Features', 'Priority Support', 'RAW Storage Add-on', '100GB ZIP Packages'],
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
