import { HAFASH_PLANS, type PlanId } from '@/lib/plans';

export type SubscriptionState =
  | 'active'
  | 'grace'
  | 'expired'
  | 'inactive';

export interface SubscriptionInfo {
  state: SubscriptionState;
  planId: PlanId;
  planName: string;
  storageGb: number;
  renewalDate: Date | null;
  graceEndDate: Date | null;
  graceDaysRemaining: number;
}

export function getSubscriptionInfo(userData: any): SubscriptionInfo {
  const planId = (userData?.planId as PlanId) || 'starter';
  const plan = HAFASH_PLANS[planId] || HAFASH_PLANS.starter;

  const status = userData?.subscriptionStatus;

  // Never assume an old/missing account has an expiry date.
  if (!userData?.subscriptionNextRenewal) {
    return {
      state: status === 'active' ? 'active' : 'inactive',
      planId,
      planName: plan.name,
      storageGb: plan.storageGb,
      renewalDate: null,
      graceEndDate: null,
      graceDaysRemaining: 0,
    };
  }

  const renewalDate = new Date(userData.subscriptionNextRenewal);

  if (Number.isNaN(renewalDate.getTime())) {
    return {
      state: status === 'active' ? 'active' : 'inactive',
      planId,
      planName: plan.name,
      storageGb: plan.storageGb,
      renewalDate: null,
      graceEndDate: null,
      graceDaysRemaining: 0,
    };
  }

  const now = new Date();

  if (status === 'active' && now < renewalDate) {
    return {
      state: 'active',
      planId,
      planName: plan.name,
      storageGb: plan.storageGb,
      renewalDate,
      graceEndDate: null,
      graceDaysRemaining: 0,
    };
  }

  const graceEndDate = new Date(renewalDate);
  graceEndDate.setDate(graceEndDate.getDate() + 7);

  if (now < graceEndDate) {
    const remainingMs = graceEndDate.getTime() - now.getTime();
    const graceDaysRemaining = Math.ceil(
      remainingMs / (1000 * 60 * 60 * 24)
    );

    return {
      state: 'grace',
      planId,
      planName: plan.name,
      storageGb: plan.storageGb,
      renewalDate,
      graceEndDate,
      graceDaysRemaining,
    };
  }

  return {
    state: 'expired',
    planId,
    planName: plan.name,
    storageGb: plan.storageGb,
    renewalDate,
    graceEndDate,
    graceDaysRemaining: 0,
  };
}
