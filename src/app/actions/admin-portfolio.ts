'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function updatePortfolioData(data: any) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    // Humne ek fixed document ID 'master' use ki hai
    await adminDb.collection('portfolio_data').doc('master').set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_PORTFOLIO]', error);
    return { success: false, error: error.message };
  }
}