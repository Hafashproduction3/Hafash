import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';

/**
 * ✅ Auto-Delete Expired Starter Galleries
 * Runs daily at 12:00 AM Pakistan time (19:00 UTC)
 */
export async function GET(request: Request) {
  // ✅ Security check
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

  console.log('🧹 [CLEANUP] Starting expired gallery cleanup...');

  if (!adminDb) {
    return NextResponse.json({ error: 'DB offline' }, { status: 500 });
  }

  try {
    const now = new Date();

    // ✅ Find all galleries that have expired
    const expiredGalleries = await adminDb
      .collection('galleries')
      .where('autoDeleteAt', '<=', now.toISOString())
      .get();

    console.log(`🧹 [CLEANUP] Found ${expiredGalleries.size} expired galleries`);

    let deletedGalleries = 0;
    let deletedPhotos = 0;
    let errors = 0;

    for (const galleryDoc of expiredGalleries.docs) {
      const galleryData = galleryDoc.data();
      const galleryId = galleryDoc.id;

      try {
        // ✅ STEP 1: Get all photos from subcollection
        const photosSnap = await galleryDoc.ref.collection('photos').get();

        const storageKeys: string[] = [];
        photosSnap.docs.forEach(pDoc => {
          const pData = pDoc.data();
          if (pData.storageKey) storageKeys.push(pData.storageKey);
          if (pData.thumbKey) storageKeys.push(pData.thumbKey);
          if (pData.originalKey) storageKeys.push(pData.originalKey);
        });

        // ✅ STEP 2: Delete photos from Firestore
        for (const photoDoc of photosSnap.docs) {
          try {
            await photoDoc.ref.delete();
            deletedPhotos++;
          } catch (e: any) {
            console.error(`❌ [CLEANUP] Photo delete failed:`, e.message);
          }
        }

        // ✅ STEP 3: Delete from R2 (background — don't block)
        if (storageKeys.length > 0) {
          for (const key of storageKeys) {
            try {
              await storage.deleteFile(key);
            } catch (e: any) {
              console.error(`⚠️ [R2_CLEANUP] Failed: ${key}`, e.message);
            }
          }
        }

        // ✅ STEP 4: Delete gallery document
        await galleryDoc.ref.delete();
        deletedGalleries++;

        console.log(`✅ [CLEANUP] Deleted gallery: ${galleryData.title} (${galleryId})`);

        // ✅ STEP 5: Send notification to photographer
        if (galleryData.userId) {
          try {
            await adminDb.collection('notifications').add({
              userId: galleryData.userId,
              type: 'gallery_expired',
              title: `Gallery Expired: ${galleryData.title}`,
              message: `Aapki gallery "${galleryData.title}" 7 din baad expire ho gayi aur delete kar di gayi. Professional plan lein taake galleries permanent rahein.`,
              createdAt: now.toISOString(),
              isRead: false,
            });
          } catch (e: any) {
            console.error(`⚠️ [CLEANUP] Notification failed:`, e.message);
          }
        }
      } catch (e: any) {
        console.error(`❌ [CLEANUP] Gallery ${galleryId} failed:`, e.message);
        errors++;
      }
    }

    console.log(`🧹 [CLEANUP] Complete. Galleries: ${deletedGalleries}, Photos: ${deletedPhotos}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      deletedGalleries,
      deletedPhotos,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('🧹 [CLEANUP] FATAL:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}