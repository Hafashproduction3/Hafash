'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function updateUserPlan(
  adminUid: string,
  targetUserId: string,
  newPlanId: string,
  durationDays: number | 'lifetime',
  paymentReference: string = ''
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userRef = adminDb.collection('users').doc(targetUserId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) return { success: false, error: 'User not found' };
    
    const userData = userSnap.data();
    const oldPlanId = userData?.planId || 'none';

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

    await userRef.update({
      planId: newPlanId,
      planStatus: newPlanId === 'none' ? 'inactive' : 'active',
      planExpiryDate: newPlanId === 'none' ? null : planExpiryDate,
      subscriptionStatus: newPlanId === 'none' ? 'inactive' : 'active',
      lastPlanChangeBy: 'admin',
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('admin_logs').add({
      adminId: adminUid,
      action: 'plan_changed',
      targetType: 'user',
      targetId: targetUserId,
      targetEmail: userData?.email || '',
      before: { planId: oldPlanId },
      after: { planId: newPlanId },
      paymentReference: paymentReference || null,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_PLAN_ERROR]', error);
    return { success: false, error: error.message };
  }
}

// ✅ Custom Storage Limit
export async function updateUserCustomStorage(
  adminUid: string,
  targetUserId: string,
  customStorageGb: number | null
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userRef = adminDb.collection('users').doc(targetUserId);
    
    await userRef.update({
      customStorageLimitGb: customStorageGb,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('admin_logs').add({
      adminId: adminUid,
      action: 'custom_storage_changed',
      targetType: 'user',
      targetId: targetUserId,
      after: { customStorageLimitGb: customStorageGb },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_CUSTOM_STORAGE_ERROR]', error);
    return { success: false, error: error.message };
  }
}

// ✅ Feature Overrides
export async function updateUserFeatureOverrides(
  adminUid: string,
  targetUserId: string,
  feature: string,
  value: boolean | null 
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userRef = adminDb.collection('users').doc(targetUserId);
    
    let updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (value === null) {
      updateData[`featureOverrides.${feature}`] = FieldValue.delete();
    } else {
      updateData[`featureOverrides.${feature}`] = value;
    }

    await userRef.update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_FEATURE_ERROR]', error);
    return { success: false, error: error.message };
  }
}