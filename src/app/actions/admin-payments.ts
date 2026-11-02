'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function logManualPayment(
  adminUid: string,
  userId: string,
  planId: string,
  amount: number,
  method: string = 'manual',
  reference: string = ''
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const orderId = `manual_${Date.now()}`;
    
    await adminDb.collection('payments').add({
      orderId,
      userId,
      planId,
      amount,
      currency: 'PKR',
      status: 'succeeded',
      method,
      reference,
      createdAt: new Date().toISOString(),
      recordedBy: adminUid,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[LOG_MANUAL_PAYMENT]', error);
    return { success: false, error: error.message };
  }
}