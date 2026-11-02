'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function toggleUserSuspension(
  adminUid: string,
  targetUserId: string,
  suspend: boolean,
  reason: string = ''
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const userRef = adminDb.collection('users').doc(targetUserId);
    
    await userRef.update({
      isSuspended: suspend,
      suspensionReason: suspend ? reason : null,
      suspendedAt: suspend ? new Date().toISOString() : null,
      suspendedBy: suspend ? adminUid : null,
    });

    // Audit log
    await adminDb.collection('admin_logs').add({
      adminId: adminUid,
      action: suspend ? 'user_suspended' : 'user_unsuspended',
      targetType: 'user',
      targetId: targetUserId,
      reason: reason,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[TOGGLE_SUSPENSION]', error);
    return { success: false, error: error.message };
  }
}