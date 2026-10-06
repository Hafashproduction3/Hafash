'use server';

import { adminDb } from '@/lib/firebase-admin';
import { 
  generateInvoiceNumber, 
  calculateInvoice,
  type Booking,
  type Invoice 
} from '@/lib/portfolio-types';
import { DEFAULT_STATUSES } from '@/lib/booking-status';

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO PHOTOS
// ═══════════════════════════════════════════════════════════════

export async function addPortfolioPhoto(
  userId: string,
  photo: {
    id: string;
    url: string;
    thumbUrl?: string;
    storageKey: string;
    thumbKey?: string;
    caption?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioPhotos || [];

    if (existing.length >= 50) {
      return { success: false, error: 'Maximum 50 portfolio photos allowed' };
    }

    const newPhoto = {
      id: photo.id,
      url: photo.url,
      thumbUrl: photo.thumbUrl || photo.url,
      storageKey: photo.storageKey,
      thumbKey: photo.thumbKey || '',
      caption: photo.caption || '',
      folderId: null,           // 🆕 Default no folder
      order: existing.length,
      uploadedAt: new Date().toISOString(),
    };

    await userRef.update({
      portfolioPhotos: [...existing, newPhoto],
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[ADD_PORTFOLIO_PHOTO]', error);
    return { success: false, error: error.message };
  }
}

export async function removePortfolioPhoto(
  userId: string,
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioPhotos || [];
    const filtered = existing.filter((p) => p.id !== photoId);

    const reordered = filtered.map((p, idx) => ({ ...p, order: idx }));

    await userRef.update({
      portfolioPhotos: reordered,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[REMOVE_PORTFOLIO_PHOTO]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🆕 PORTFOLIO FOLDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new folder
 */
export async function createPortfolioFolder(
  userId: string,
  folder: {
    name: string;
    description?: string;
    coverImage?: string;
    coverKey?: string;
  }
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioFolders || [];

    // Check duplicate name
    const duplicate = existing.find(
      (f) => f.name.toLowerCase() === folder.name.trim().toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: 'Yeh naam already exist karta hai' };
    }

    const folderId = Math.random().toString(36).substring(2, 11);
    const newFolder = {
      id: folderId,
      name: folder.name.trim(),
      slug: folder.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: folder.description?.trim() || '',
      coverImage: folder.coverImage || '',
      coverKey: folder.coverKey || '',
      order: existing.length,
      photoCount: 0,
      createdAt: new Date().toISOString(),
    };

    await userRef.update({
      portfolioFolders: [...existing, newFolder],
      updatedAt: new Date().toISOString(),
    });

    return { success: true, folderId };
  } catch (error: any) {
    console.error('[CREATE_FOLDER]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a folder
 */
export async function updatePortfolioFolder(
  userId: string,
  folderId: string,
  updates: {
    name?: string;
    description?: string;
    coverImage?: string;
    coverKey?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioFolders || [];

    const updated = existing.map((f) => {
      if (f.id !== folderId) return f;

      const name = updates.name?.trim() || f.name;
      return {
        ...f,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: updates.description !== undefined ? updates.description : f.description,
        coverImage: updates.coverImage !== undefined ? updates.coverImage : f.coverImage,
        coverKey: updates.coverKey !== undefined ? updates.coverKey : f.coverKey,
        updatedAt: new Date().toISOString(),
      };
    });

    await userRef.update({
      portfolioFolders: updated,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_FOLDER]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a folder (photos folderId null ho jayega)
 */
export async function deletePortfolioFolder(
  userId: string,
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existingFolders: any[] = data.portfolioFolders || [];
    const existingPhotos: any[] = data.portfolioPhotos || [];

    // Remove folder
    const updatedFolders = existingFolders
      .filter((f) => f.id !== folderId)
      .map((f, idx) => ({ ...f, order: idx }));

    // Unassign photos from this folder
    const updatedPhotos = existingPhotos.map((p) => {
      if (p.folderId === folderId) {
        return { ...p, folderId: null };
      }
      return p;
    });

    await userRef.update({
      portfolioFolders: updatedFolders,
      portfolioPhotos: updatedPhotos,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_FOLDER]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign photo to folder
 */
export async function assignPhotoToFolder(
  userId: string,
  photoId: string,
  folderId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existingPhotos: any[] = data.portfolioPhotos || [];
    const existingFolders: any[] = data.portfolioFolders || [];

    const updatedPhotos = existingPhotos.map((p) => {
      if (p.id === photoId) {
        return { ...p, folderId: folderId || null };
      }
      return p;
    });

    // Update photo counts
    const updatedFolders = existingFolders.map((f) => {
      const count = updatedPhotos.filter((p) => p.folderId === f.id).length;
      return { ...f, photoCount: count };
    });

    await userRef.update({
      portfolioPhotos: updatedPhotos,
      portfolioFolders: updatedFolders,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[ASSIGN_PHOTO]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reorder folders
 */
export async function reorderPortfolioFolders(
  userId: string,
  folderIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioFolders || [];

    const reordered = folderIds
      .map((id, idx) => {
        const folder = existing.find((f) => f.id === id);
        if (!folder) return null;
        return { ...folder, order: idx };
      })
      .filter(Boolean);

    await userRef.update({
      portfolioFolders: reordered,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[REORDER_FOLDERS]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BRANDING IMAGES
// ═══════════════════════════════════════════════════════════════

export async function saveBrandingImage(
  userId: string,
  type: 'logo' | 'banner' | 'photo',
  url: string,
  storageKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const fieldMap = {
      logo: { url: 'studioLogo', key: 'studioLogoKey' },
      banner: { url: 'studioBanner', key: 'studioBannerKey' },
      photo: { url: 'photographerPhoto', key: 'photographerPhotoKey' },
    };

    const fields = fieldMap[type];
    if (!fields) {
      return { success: false, error: 'Invalid branding type' };
    }

    await adminDb.collection('publicProfiles').doc(userId).set(
      {
        [fields.url]: url,
        [fields.key]: storageKey,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('[SAVE_BRANDING]', error);
    return { success: false, error: error.message };
  }
}

export async function removeBrandingImage(
  userId: string,
  type: 'logo' | 'banner' | 'photo'
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const fieldMap = {
      logo: { url: 'studioLogo', key: 'studioLogoKey' },
      banner: { url: 'studioBanner', key: 'studioBannerKey' },
      photo: { url: 'photographerPhoto', key: 'photographerPhotoKey' },
    };

    const fields = fieldMap[type];
    if (!fields) {
      return { success: false, error: 'Invalid branding type' };
    }

    await adminDb.collection('publicProfiles').doc(userId).set(
      {
        [fields.url]: '',
        [fields.key]: '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (error: any) {
    console.error('[REMOVE_BRANDING]', error);
    return { success: false, error: error.message };
  }
}

export async function updatePortfolioPhotoCaption(
  userId: string,
  photoId: string,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const userRef = adminDb.collection('publicProfiles').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'Profile not found' };
    }

    const data = userSnap.data() || {};
    const existing: any[] = data.portfolioPhotos || [];

    const updated = existing.map((p) =>
      p.id === photoId ? { ...p, caption } : p
    );

    await userRef.update({
      portfolioPhotos: updated,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_CAPTION]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOKING
// ═══════════════════════════════════════════════════════════════

export async function createBooking(
  data: {
    photographerId: string;
    photographerSubdomain: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    eventDate: string;
    eventType: string;
    city: string;
    budget?: string;
    message?: string;
    packageSelected?: string;
  }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const now = new Date().toISOString();

    const bookingData = {
      photographerId: data.photographerId,
      photographerSubdomain: data.photographerSubdomain,
      clientName: data.clientName.trim(),
      clientEmail: data.clientEmail.trim().toLowerCase(),
      clientPhone: data.clientPhone.trim(),
      eventDate: data.eventDate,
      eventType: data.eventType,
      city: data.city,
      budget: data.budget || '',
      message: data.message || '',
      packageSelected: data.packageSelected || '',
      status: 'pending',
      
      statuses: JSON.parse(JSON.stringify(DEFAULT_STATUSES)),
      currentStatus: 'received',
      galleryId: null,
      paymentProof: null,
      
      createdAt: now,
      updatedAt: now,
    };

    const ref = await adminDb.collection('bookings').add(bookingData);

    await adminDb.collection('notifications').add({
      userId: data.photographerId,
      type: 'new_booking',
      title: '🎉 New Booking Request',
      body: `${data.clientName} — ${data.eventType} on ${data.eventDate}`,
      link: '/dashboard/bookings',
      isRead: false,
      createdAt: now,
    });

    return { success: true, bookingId: ref.id };
  } catch (error: any) {
    console.error('[CREATE_BOOKING]', error);
    return { success: false, error: error.message };
  }
}

export async function acceptBooking(
  bookingId: string,
  packageName: string,
  packagePrice: number,
  advancePercent: number = 30
): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const invoiceCount = await adminDb
      .collection('bookings')
      .where('invoice.status', '!=', null)
      .get()
      .then((snap) => snap.size);

    const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);
    const invoiceData = calculateInvoice(packageName, packagePrice, advancePercent);

    const invoice: Invoice = {
      invoiceNumber,
      ...invoiceData,
      paymentSchedule: [],
      dataDeliveryDate: '',
      dataDeliveryMethod: '',
      termsAndConditions: '',
      cancellationPolicy: '',
      status: 'draft',
    };

    await bookingRef.update({
      status: 'accepted',
      invoice,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error('[ACCEPT_BOOKING]', error);
    return { success: false, error: error.message };
  }
}

export async function rejectBooking(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      status: 'rejected',
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[REJECT_BOOKING]', error);
    return { success: false, error: error.message };
  }
}

export async function updateInvoice(
  bookingId: string,
  invoice: Partial<Invoice>
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const existing = bookingSnap.data()?.invoice || {};

    await bookingRef.update({
      invoice: { ...existing, ...invoice },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_INVOICE]', error);
    return { success: false, error: error.message };
  }
}

export async function markBookingCompleted(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[MARK_COMPLETED]', error);
    return { success: false, error: error.message };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status']
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_BOOKING_STATUS]', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('bookings').doc(bookingId).delete();
    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_BOOKING]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOKING STATUS TRACKING
// ═══════════════════════════════════════════════════════════════

export async function updateBookingStatuses(
  bookingId: string,
  statuses: any[],
  currentStatus: string,
  galleryId: string | null = null,
  paymentProof: string | null = null
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      statuses,
      currentStatus,
      galleryId,
      paymentProof,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_BOOKING_STATUSES]', error);
    return { success: false, error: error.message };
  }
}