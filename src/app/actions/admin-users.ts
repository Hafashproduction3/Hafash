'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function updateUserPlan(
  adminUid: string,
  targetUserId: string,
  newPlanId: string,
  durationDays: number | 'lifetime'
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userRef = adminDb.collection('users').doc(targetUserId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) return { success: false, error: 'User not found' };
    
    const userData = userSnap.data();
    const oldPlanId = userData?.planId || 'none';

    // Expiry date calculate karein
    let planExpiryDate = null;
    if (durationDays !== 'lifetime') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + durationDays);
      planExpiryDate = expiry.toISOString();
    } else {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 100);
      planExpiryDate = expiry.toISOString();
    }

    // User update karein
    await userRef.update({
      planId: newPlanId,
      planStatus: newPlanId === 'none' ? 'inactive' : 'active',
      planExpiryDate: newPlanId === 'none' ? null : planExpiryDate,
      subscriptionStatus: newPlanId === 'none' ? 'inactive' : 'active',
      lastPlanChangeBy: 'admin',
      updatedAt: new Date().toISOString(),
    });

    // Audit log banayein
    await adminDb.collection('admin_logs').add({
      adminId: adminUid,
      action: 'plan_changed',
      targetType: 'user',
      targetId: targetUserId,
      targetEmail: userData?.email || '',
      before: { planId: oldPlanId },
      after: { planId: newPlanId },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_PLAN_ERROR]', error);
    return { success: false, error: error.message };
  }
}