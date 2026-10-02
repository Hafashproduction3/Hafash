import { NextResponse } from 'next/server';
import { autoCancelExpiredBookings } from '@/app/actions/quotes';

/**
 * Auto-Cancel Expired Bookings Cron
 * 
 * Schedule: Daily at 2 AM (Vercel Cron)
 * 
 * Yeh endpoint:
 * - Saari "invoice_sent" bookings check karta hai
 * - Jinka advanceDeadline guzar chuka hai
 * - Unko "auto_cancelled" kar deta hai
 * - Photographer ko notification bhejta hai
 */

export async function GET(request: Request) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;
      if (authHeader !== expectedAuth) {
        console.error('[CRON_AUTO_CANCEL] Unauthorized request');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON_AUTO_CANCEL] Starting...');

    const result = await autoCancelExpiredBookings();

    console.log('[CRON_AUTO_CANCEL] Result:', result);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to auto-cancel' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cancelled: result.cancelled,
      message: `${result.cancelled} bookings cancelled`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON_AUTO_CANCEL] FATAL:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}