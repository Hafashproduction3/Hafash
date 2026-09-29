import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendExpiryReminderEmail } from '@/lib/email/sendExpiryReminder';

/**
 * ✅ Send Warnings: 2 days before, 1 day before expiry
 * Runs daily at 9:00 AM Pakistan time (4:00 UTC)
 */
export async function GET(request: Request) {
  const bypassHeader = request.headers.get('x-vercel-protection-bypass');
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const isVercelCron = bypassSecret && bypassHeader === bypassSecret;

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isAuthCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const isQueryCron = cronSecret && queryToken === cronSecret;

  if (!isVercelCron && !isAuthCron && !isQueryCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('⚠️ [WARNINGS] Starting gallery expiry warnings...');

  if (!adminDb) {
    return NextResponse.json({ error: 'DB offline' }, { status: 500 });
  }

  try {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // ✅ Find galleries expiring in next 2 days
    const expiringGalleries = await adminDb
      .collection('galleries')
      .where('autoDeleteAt', '<=', twoDaysLater.toISOString())
      .where('autoDeleteAt', '>', now.toISOString())
      .get();

    console.log(`⚠️ [WARNINGS] Found ${expiringGalleries.size} galleries expiring soon`);

    let warningsSent = 0;
    let skipped = 0;

    for (const galleryDoc of expiringGalleries.docs) {
      const galleryData = galleryDoc.data();
      const autoDeleteAt = new Date(galleryData.autoDeleteAt);
      const hoursLeft = Math.ceil((autoDeleteAt.getTime() - now.getTime()) / (1000 * 60 * 60));
      const daysLeft = Math.ceil(hoursLeft / 24);

      // Skip if already warned today
      if (galleryData.lastExpiryWarningSent) {
        const lastSent = new Date(galleryData.lastExpiryWarningSent);
        if (now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000) {
          skipped++;
          continue;
        }
      }

      // Get photographer info
      if (!galleryData.userId) {
        skipped++;
        continue;
      }

      const userSnap = await adminDb.collection('users').doc(galleryData.userId).get();
      if (!userSnap.exists) {
        skipped++;
        continue;
      }

      const userData = userSnap.data() || {};
      if (!userData.email || userData.email === 'hafashgroup60@gmail.com') {
        skipped++;
        continue;
      }

      // ✅ Send warning email
      try {
        await sendExpiryReminderEmail({
          to: userData.email,
          userName: userData.photographerName || userData.displayName || 'Photographer',
          planName: 'Starter',
          daysLeft: daysLeft,
          expiryDate: autoDeleteAt.toLocaleDateString('en-PK', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          renewUrl: 'https://hafash.pk/storage',
        });

        // ✅ In-app notification
        await adminDb.collection('notifications').add({
          userId: galleryData.userId,
          type: 'gallery_expiry_warning',
          title: `Gallery "${galleryData.title}" ${daysLeft} din mein delete hogi`,
          message: `Aapki gallery 7 din ka expiry complete kar rahi hai. ${daysLeft} din baad delete ho jayegi. Professional plan lein taake galleries permanent rahein.`,
          createdAt: now.toISOString(),
          isRead: false,
        });

        // Mark warning sent
        await galleryDoc.ref.update({
          lastExpiryWarningSent: now.toISOString(),
        });

        warningsSent++;
        console.log(`✅ [WARNINGS] Sent to ${userData.email} for gallery: ${galleryData.title}`);
      } catch (e: any) {
        console.error(`❌ [WARNINGS] Email failed:`, e.message);
      }
    }

    console.log(`⚠️ [WARNINGS] Complete. Sent: ${warningsSent}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      warningsSent,
      skipped,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('⚠️ [WARNINGS] FATAL:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}