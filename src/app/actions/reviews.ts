'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * ═══════════════════════════════════════════════════════════════
 * SUBMIT REVIEW (Client)
 * ═══════════════════════════════════════════════════════════════
 */
export async function submitReview({
  galleryId,
  clientName,
  rating,
  text,
  eventType,
  photographerId: passedPhotographerId,
}: {
  galleryId: string;
  clientName: string;
  rating: number;
  text: string;
  eventType?: string;
  photographerId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const gallerySnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!gallerySnap.exists) {
      return { success: false, error: 'Gallery not found' };
    }

    const galleryData = gallerySnap.data() || {};
    const photographerId = passedPhotographerId || galleryData.userId || null;

    if (!photographerId) {
      return { success: false, error: 'Photographer not found' };
    }

    const reviewRef = adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('reviews')
      .doc();

    await reviewRef.set({
      id: reviewRef.id,
      galleryId,
      photographerId,
      clientName: clientName.trim() || 'Happy Client',
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      text: text.trim(),
      eventType: eventType || galleryData.category || '',
      status: 'pending',
      createdAt: new Date(),
      approvedAt: null,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[SUBMIT_REVIEW]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * APPROVE REVIEW
 * ═══════════════════════════════════════════════════════════════
 */
export async function approveReview({
  galleryId,
  reviewId,
}: {
  galleryId: string;
  reviewId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('reviews')
      .doc(reviewId)
      .update({
        status: 'approved',
        approvedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    console.error('[APPROVE_REVIEW]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * REJECT REVIEW
 * ═══════════════════════════════════════════════════════════════
 */
export async function rejectReview({
  galleryId,
  reviewId,
}: {
  galleryId: string;
  reviewId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('reviews')
      .doc(reviewId)
      .update({
        status: 'rejected',
      });

    return { success: true };
  } catch (error: any) {
    console.error('[REJECT_REVIEW]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * DELETE REVIEW
 * ═══════════════════════════════════════════════════════════════
 */
export async function deleteReview({
  galleryId,
  reviewId,
}: {
  galleryId: string;
  reviewId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('reviews')
      .doc(reviewId)
      .delete();

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_REVIEW]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * HELPER — Timestamp → milliseconds
 * ═══════════════════════════════════════════════════════════════
 */
function timestampToMs(obj: any): number {
  if (!obj) return 0;
  if (typeof obj === 'object') {
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj._seconds === 'number') return obj._seconds * 1000;
    if (typeof obj.toDate === 'function') {
      try { return obj.toDate().getTime(); } catch { return 0; }
    }
  }
  if (obj instanceof Date) return obj.getTime();
  if (typeof obj === 'string') {
    const t = new Date(obj).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof obj === 'number') return obj;
  return 0;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * GET PHOTOGRAPHER REVIEWS (Approved only — public profile)
 * ═══════════════════════════════════════════════════════════════
 */
export async function getPhotographerReviews(
  photographerId: string
): Promise<{ success: boolean; reviews?: any[]; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', photographerId)
      .get();

    const allReviews: any[] = [];

    await Promise.all(
      galleriesSnap.docs.map(async (galleryDoc) => {
        const reviewsSnap = await galleryDoc.ref
          .collection('reviews')
          .where('status', '==', 'approved')
          .get();

        reviewsSnap.docs.forEach((reviewDoc) => {
          allReviews.push({
            id: reviewDoc.id,
            galleryId: galleryDoc.id,
            ...reviewDoc.data(),
          });
        });
      })
    );

    allReviews.sort((a, b) => {
      const aT = timestampToMs(a.approvedAt) || timestampToMs(a.createdAt);
      const bT = timestampToMs(b.approvedAt) || timestampToMs(b.createdAt);
      return bT - aT;
    });

    return { success: true, reviews: allReviews };
  } catch (error: any) {
    console.error('[GET_PHOTOGRAPHER_REVIEWS]', error);
    return { success: false, error: error.message };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * GET DASHBOARD REVIEWS (All statuses — photographer dashboard)
 * ═══════════════════════════════════════════════════════════════
 */
export async function getDashboardReviews(
  photographerId: string
): Promise<{ success: boolean; reviews?: any[]; error?: string }> {
  console.log('[GET_DASHBOARD_REVIEWS] Called for:', photographerId);
  console.log('[GET_DASHBOARD_REVIEWS] adminDb exists:', !!adminDb);

  if (!adminDb) {
    console.error('[GET_DASHBOARD_REVIEWS] ❌ adminDb is null');
    return { success: false, error: 'DB offline' };
  }

  try {
    console.log('[GET_DASHBOARD_REVIEWS] Querying galleries...');

    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', photographerId)
      .get();

    console.log('[GET_DASHBOARD_REVIEWS] Galleries found:', galleriesSnap.size);

    const allReviews: any[] = [];

    await Promise.all(
      galleriesSnap.docs.map(async (galleryDoc) => {
        const reviewsSnap = await galleryDoc.ref.collection('reviews').get();
        console.log(`[GET_DASHBOARD_REVIEWS] Reviews in ${galleryDoc.id}:`, reviewsSnap.size);

        reviewsSnap.docs.forEach((reviewDoc) => {
          allReviews.push({
            id: reviewDoc.id,
            galleryId: galleryDoc.id,
            galleryTitle: galleryDoc.data().title || 'Gallery',
            ...reviewDoc.data(),
          });
        });
      })
    );

    console.log('[GET_DASHBOARD_REVIEWS] ✅ Total reviews:', allReviews.length);

    allReviews.sort((a, b) => {
      // Pending reviews sabse upar
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;

      // Phir date ke hisaab se
      const aT = timestampToMs(a.createdAt);
      const bT = timestampToMs(b.createdAt);
      return bT - aT;
    });

    return { success: true, reviews: allReviews };
  } catch (error: any) {
    console.error('[GET_DASHBOARD_REVIEWS] ❌ FATAL:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}