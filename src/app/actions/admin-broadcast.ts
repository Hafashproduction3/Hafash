'use server';
import { adminDb } from '@/lib/firebase-admin';

export async function sendBroadcastNotification(adminUid: string, title: string, body: string, link: string = '/dashboard') {
  if (!adminDb) return { success: false, error: 'DB offline' };
  try {
    const usersSnap = await adminDb.collection('users').get();
    const batch = adminDb.batch();
    
    usersSnap.docs.forEach(userDoc => {
      const notifRef = adminDb.collection('notifications').doc();
      batch.set(notifRef, {
        userId: userDoc.id,
        type: 'admin_broadcast',
        title,
        body,
        link,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });
    
    await batch.commit();
    
    // Audit Log
    await adminDb.collection('admin_logs').add({
      adminId: adminUid, action: 'broadcast_sent', targetType: 'system', targetId: 'all',
      timestamp: new Date().toISOString(),
    });
    
    return { success: true, count: usersSnap.size };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}