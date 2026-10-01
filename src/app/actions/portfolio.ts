'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Update portfolio theme for a photographer
 */
export async function updatePortfolioTheme(
  userId: string,
  theme: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('users').doc(userId).update({
      theme,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('publicProfiles').doc(userId).update({
      theme,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_THEME]', error);
    return { success: false, error: error.message };
  }
}