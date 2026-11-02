'use server';

import { adminDb } from '@/lib/firebase-admin';

// Naya message create karne ke liye (User side se)
export async function createSupportTicket(userId: string, userName: string, userEmail: string, message: string) {
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
    return { success: false, error: error.message };
  }
}

// Admin reply karne ke liye
export async function replyToTicket(ticketId: string, adminUid: string, replyMessage: string, closeTicket: boolean = false) {
  if (!adminDb) return { success: false, error: 'DB offline' };
  try {
    const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
    const ticketSnap = await ticketRef.get();
    
    if (!ticketSnap.exists) return { success: false, error: 'Ticket not found' };
    const data = ticketSnap.data();

    const newReply = {
      sender: 'admin',
      message: replyMessage,
      createdAt: new Date().toISOString(),
    };

    await ticketRef.update({
      replies: [...(data?.replies || []), newReply],
      status: closeTicket ? 'closed' : 'replied',
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}