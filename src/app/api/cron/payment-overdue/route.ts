import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Payment Overdue Cron
 * 
 * Schedule: Daily at 4 AM (Vercel Cron)
 * 
 * Yeh endpoint:
 * - Saari bookings check karta hai
 * - Jinki payment due date guzar chuki hai (aur paid nahi hui)
 * - Photographer ko notification bhejta hai
 * - Duplicate notifications avoid karta hai
 */

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;
      if (authHeader !== expectedAuth) {
        console.error('[CRON_PAYMENT_OVERDUE] Unauthorized');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'DB offline' }, { status: 500 });
    }

    console.log('[CRON_PAYMENT_OVERDUE] Starting...');

    const now = new Date();
    const snap = await adminDb
      .collection('bookings')
      .get();

    let notificationsSent = 0;
    const photographerOverdueMap: Record<string, {
      count: number;
      totalAmount: number;
      clients: string[];
    }> = {};

    snap.docs.forEach((doc) => {
      const booking = doc.data();

      // Skip cancelled bookings
      if (
        booking.status === 'auto_cancelled' ||
        booking.status === 'manually_cancelled' ||
        booking.status === 'completed'
      ) return;

      if (!booking.invoice?.paymentSchedule) return;

      let hasOverdue = false;
      let overdueAmount = 0;

      (booking.invoice.paymentSchedule || []).forEach((payment: any) => {
        if (payment.status !== 'paid' && payment.dueDate) {
          const dueDate = new Date(payment.dueDate);
          if (dueDate < now) {
            hasOverdue = true;
            overdueAmount += payment.amount || 0;
          }
        }
      });

      if (hasOverdue) {
        const pid = booking.photographerId;
        if (!photographerOverdueMap[pid]) {
          photographerOverdueMap[pid] = { count: 0, totalAmount: 0, clients: [] };
        }
        photographerOverdueMap[pid].count++;
        photographerOverdueMap[pid].totalAmount += overdueAmount;
        photographerOverdueMap[pid].clients.push(booking.clientName);
      }
    });

    // Send one notification per photographer
    for (const [photographerId, data] of Object.entries(photographerOverdueMap)) {
      // Check if we already sent a notification today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotif = await adminDb
        .collection('notifications')
        .where('userId', '==', photographerId)
        .where('type', '==', 'payment_overdue')
        .where('createdAt', '>=', today.toISOString())
        .limit(1)
        .get();

      if (!existingNotif.empty) {
        console.log(`[CRON_PAYMENT_OVERDUE] Already sent today for ${photographerId}`);
        continue;
      }

      // Create notification
      await adminDb.collection('notifications').add({
        userId: photographerId,
        type: 'payment_overdue',
        title: `💰 ${data.count} Overdue Payment${data.count > 1 ? 's' : ''}`,
        body: `Rs. ${data.totalAmount.toLocaleString()} pending from ${data.clients.slice(0, 2).join(', ')}${data.clients.length > 2 ? ` +${data.clients.length - 2} more` : ''}`,
        link: '/dashboard/payments',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      notificationsSent++;
    }

    console.log('[CRON_PAYMENT_OVERDUE] Complete:', {
      photographerCount: Object.keys(photographerOverdueMap).length,
      notificationsSent,
    });

    return NextResponse.json({
      success: true,
      photographersWithOverdue: Object.keys(photographerOverdueMap).length,
      notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON_PAYMENT_OVERDUE] FATAL:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}