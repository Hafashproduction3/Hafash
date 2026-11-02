'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function updateGlobalSettings(data: {
  maintenanceMode?: boolean;
  announcement?: string;
  announcementActive?: boolean;
}) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const settingsRef = adminDb.collection('settings').doc('global');
    
    await settingsRef.set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_SETTINGS]', error);
    return { success: false, error: error.message };
  }
}