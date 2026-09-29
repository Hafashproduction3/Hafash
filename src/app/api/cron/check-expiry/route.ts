import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendExpiryReminderEmail } from '@/lib/email/sendExpiryReminder';

// ✅ Vercel Cron — with Protection Bypass support
export async function GET(request: Request) {
  // ✅ Check 1: Vercel's Protection Bypass (for automatic cron)
  const bypassHeader = request.headers.get('x-vercel-protection-bypass');
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const isVercelCron = bypassSecret && bypassHeader === bypassSecret;

  // ✅ Check 2: CRON_SECRET (for manual testing)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isAuthCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // ✅ Check 3: Query param token (Cloudflare bypass)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const isQueryCron = cronSecret && queryToken === cronSecret;

  // ❌ Agar koi bhi check pass nahi hua
  if (!isVercelCron && !isAuthCron && !isQueryCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔔 [CRON] Starting plan expiry check...');
  console.log('🔔 [CRON] Auth method:', isVercelCron ? 'Vercel Cron' : isAuthCron ? 'Header' : 'Query');

  if (!adminDb) {
    return NextResponse.json({ error: 'DB offline' }, { status: 500 });
  }

  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // ✅ Fetch all users
    const usersSnap = await adminDb.collection('users').get();

    let emailsSent = 0;
    let skipped = 0;
    let errors = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();

      // Skip if no plan or no expiry
      if (!data.planId || !data.planExpiryDate) {
        skipped++;
        continue;
      }

      const expiryDate = new Date(data.planExpiryDate);
      
      // Skip if not in 0-3 days range
      if (expiryDate < now || expiryDate > threeDaysFromNow) {
        skipped++;
        continue;
      }

      // ✅ Skip if reminder already sent (in last 24 hours)
      if (data.lastRenewalReminderSent) {
        const lastSent = new Date(data.lastRenewalReminderSent);
        if (now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000) {
          skipped++;
          continue;
        }
      }

      // Skip if no email
      if (!data.email) {
        skipped++;
        continue;
      }

      // Skip owner
      if (data.email === 'hafashgroup60@gmail.com') {
        skipped++;
        continue;
      }

      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // ✅ Send email
      const emailResult = await sendExpiryReminderEmail({
        to: data.email,
        userName: data.photographerName || data.displayName || 'Photographer',
        planName: data.planId.charAt(0).toUpperCase() + data.planId.slice(1),
        daysLeft: daysLeft,
        expiryDate: expiryDate.toLocaleDateString('en-PK', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
        renewUrl: 'https://hafash.pk/storage',
      });

      if (emailResult.success) {
        // ✅ Mark reminder sent
        await userDoc.ref.update({
          lastRenewalReminderSent: now.toISOString(),
        });

        // ✅ In-app notification
        await adminDb.collection('notifications').add({
          userId: userDoc.id,
          type: 'plan_expiry_warning',
          title: `Plan ${daysLeft} din mein expire hoga`,
          message: `Aapka ${data.planId} plan ${daysLeft} din mein expire ho raha hai. Renew karein.`,
          createdAt: now.toISOString(),
          isRead: false,
        });

        emailsSent++;
        console.log(`✅ [CRON] Email sent to ${data.email} (${daysLeft} days left)`);
      } else {
        errors++;
        console.error(`❌ [CRON] Failed for ${data.email}:`, emailResult.error);
      }
    }

    console.log(`🔔 [CRON] Complete. Sent: ${emailsSent}, Skipped: ${skipped}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      emailsSent,
      skipped,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('🔔 [CRON] FATAL:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}