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
  priceAmount: number; // numeric price in PKR, used for Safepay payments.create()
  features: string[];
  priorityLevel: number; // 1 (Starter), 2 (Pro), 3 (Studio)
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

// Represents a user who has NOT paid for any plan yet. 0GB storage,
// no features. This is what new signups should see — NOT the Starter
// plan — until they actually complete a payment.
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

// IMPORTANT: this used to default to HAFASH_PLANS.starter, which meant
// every new (unpaid) user silently appeared to have the 50GB Starter
// plan active. Changed to NO_PLAN so unpaid accounts correctly show
// 0GB / no plan until they pay.
export const DEFAULT_PLAN = NO_PLAN;

/**
 * Looks up a user's plan safely. Returns NO_PLAN if they don't have a
 * valid, recognized planId set (e.g. brand new signup, never paid).
 */
export function getUserPlan(planId?: string | null): HafashPlan {
  if (!planId) return NO_PLAN;
  if (planId in HAFASH_PLANS) return HAFASH_PLANS[planId as PlanId];
  return NO_PLAN;
}

/**
 * Calculates total storage usage across all galleries.
 * Returns usage in GB using actual file sizes.
 */
export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;
  
  let totalBytes = 0;

  galleries.forEach(g => {
    const items = Array.isArray(g.items) ? g.items : [];
    items.forEach((item: any) => {
      const size = Number(item.fileSize);
      if (!isNaN(size) && size > 0) {
        totalBytes += size;
      } else {
        // Fallback for legacy items without metadata
        totalBytes += (8 * 1024 * 1024);
      }
    });
  });

  return totalBytes / (1024 * 1024 * 1024);
}