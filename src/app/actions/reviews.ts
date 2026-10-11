'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Submit a new review (from client)
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
 * Approve a review
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
 * Reject a review
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
 * Delete a review
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
 * Get approved reviews for a photographer (all galleries)
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
      const aT = a.approvedAt?.seconds || a.createdAt?.seconds || 0;
      const bT = b.approvedAt?.seconds || b.createdAt?.seconds || 0;
      return bT - aT;
    });

    return { success: true, reviews: allReviews };
  } catch (error: any) {
    console.error('[GET_PHOTOGRAPHER_REVIEWS]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all reviews (pending + approved + rejected) for dashboard
 */
export async function getDashboardReviews(
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
        const reviewsSnap = await galleryDoc.ref.collection('reviews').get();

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

    allReviews.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });

    return { success: true, reviews: allReviews };
  } catch (error: any) {
    console.error('[GET_DASHBOARD_REVIEWS]', error);
    return { success: false, error: error.message };
  }
}