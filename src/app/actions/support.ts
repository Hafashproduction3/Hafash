'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function createSupportTicket(
  userId: string,
  userName: string,
  userEmail: string,
  message: string
) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb.collection('support_tickets').add({
      userId,
      userName,
      userEmail,
      message,
      status: 'open',
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[CREATE_TICKET]', error);
    return { success: false, error: error.message };
  }
}