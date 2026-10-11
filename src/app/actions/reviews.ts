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
  try {
    if (!adminDb) {
      return { success: false, error: 'DB offline' };
    }

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

    console.log('[SUBMIT_REVIEW] ✅ Saved:', reviewRef.id);
    return { success: true };
  } catch (error: any) {
    console.error('[SUBMIT_REVIEW] ❌', error);
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
  try {
    if (!adminDb) return { success: false, error: 'DB offline' };

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
    console.error('[APPROVE_REVIEW] ❌', error);
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
  try {
    if (!adminDb) return { success: false, error: 'DB offline' };

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
    console.error('[REJECT_REVIEW] ❌', error);
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
  try {
    if (!adminDb) return { success: false, error: 'DB offline' };

    await adminDb
      .collection('galleries')
      .doc(galleryId)
      .collection('reviews')
      .doc(reviewId)
      .delete();

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_REVIEW] ❌', error);
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
  try {
    if (!adminDb) return { success: false, error: 'DB offline' };

    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', photographerId)
      .get();

    const allReviews: any[] = [];

    for (const galleryDoc of galleriesSnap.docs) {
      const reviewsSnap = await galleryDoc.ref
        .collection('reviews')
        .where('status', '==', 'approved')
        .get();

      reviewsSnap.docs.forEach((reviewDoc) => {
        const data = reviewDoc.data();
        allReviews.push({
          id: reviewDoc.id,
          galleryId: galleryDoc.id,
          clientName: data.clientName || 'Anonymous',
          rating: data.rating || 0,
          text: data.text || '',
          eventType: data.eventType || '',
          status: data.status || 'pending',
          photographerId: data.photographerId || '',
          createdAt: data.createdAt,
          approvedAt: data.approvedAt,
        });
      });
    }

    allReviews.sort((a, b) => {
      const aT = timestampToMs(a.approvedAt) || timestampToMs(a.createdAt);
      const bT = timestampToMs(b.approvedAt) || timestampToMs(b.createdAt);
      return bT - aT;
    });

    return { success: true, reviews: allReviews };
  } catch (error: any) {
    console.error('[GET_PHOTOGRAPHER_REVIEWS] ❌', error);
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
  try {
    console.log('[DASHBOARD_REVIEWS] Called for:', photographerId);
    console.log('[DASHBOARD_REVIEWS] adminDb exists:', !!adminDb);

    if (!adminDb) {
      return { success: false, error: 'DB offline — adminDb is null' };
    }

    console.log('[DASHBOARD_REVIEWS] Querying galleries...');

    const galleriesSnap = await adminDb
      .collection('galleries')
      .where('userId', '==', photographerId)
      .get();

    console.log('[DASHBOARD_REVIEWS] Galleries found:', galleriesSnap.size);

    if (galleriesSnap.empty) {
      return { success: true, reviews: [] };
    }

    const allReviews: any[] = [];

    for (const galleryDoc of galleriesSnap.docs) {
      const reviewsSnap = await galleryDoc.ref.collection('reviews').get();
      
      console.log(`[DASHBOARD_REVIEWS] ${galleryDoc.id}: ${reviewsSnap.size} reviews`);
      
      reviewsSnap.docs.forEach((reviewDoc) => {
        const data = reviewDoc.data();
        allReviews.push({
          id: reviewDoc.id,
          galleryId: galleryDoc.id,
          galleryTitle: galleryDoc.data().title || 'Gallery',
          // ✅ Explicit field mapping — spread avoid
          clientName: data.clientName || 'Anonymous',
          rating: data.rating || 0,
          text: data.text || '',
          eventType: data.eventType || '',
          status: data.status || 'pending',
          photographerId: data.photographerId || '',
          createdAt: data.createdAt,
          approvedAt: data.approvedAt,
        });
      });
    }

    console.log('[DASHBOARD_REVIEWS] ✅ Total:', allReviews.length);

    // ✅ Sort: pending first, phir date
    allReviews.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return timestampToMs(b.createdAt) - timestampToMs(a.createdAt);
    });

    return { success: true, reviews: allReviews };

  } catch (error: any) {
    console.error('[DASHBOARD_REVIEWS] ❌ FATAL:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    });
    return { 
      success: false, 
      error: `${error.code || 'ERROR'}: ${error.message}` 
    };
  }
}