'use server';

import { adminDb } from '@/lib/firebase-admin';
import {
  generateQuoteNumber,
  generateInvoiceNumber,
  generateToken,
  calculateInvoice,
  type Booking,
  type Quote,
  type Invoice,
  type ClientApproval,
  type PaymentSchedule,
} from '@/lib/portfolio-types';

// ═══════════════════════════════════════════════════════════════
// CREATE QUOTE (Photographer)
// ═══════════════════════════════════════════════════════════════

export async function createQuote(
  bookingId: string,
  quoteData: Omit<Quote, 'quoteNumber' | 'issueDate'>
): Promise<{
  success: boolean;
  quoteNumber?: string;
  token?: string;
  error?: string;
}> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    // Count existing quotes for sequence
    const countSnap = await adminDb
      .collection('bookings')
      .where('quote.quoteNumber', '!=', null)
      .get();
    const sequence = countSnap.size + 1;

    const quoteNumber = generateQuoteNumber(sequence);
    const token = generateToken();

    const now = new Date().toISOString();
    const quote: Quote = {
      quoteNumber,
      issueDate: now,
      ...quoteData,
    };

    await bookingRef.update({
      quote,
      status: 'quote_sent',
      quoteToken: token,
      updatedAt: now,
    });

    return { success: true, quoteNumber, token };
  } catch (error: any) {
    console.error('[CREATE_QUOTE]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET QUOTE BY TOKEN (Public — client)
// ═══════════════════════════════════════════════════════════════

export async function getQuoteByToken(token: string): Promise<{
  success: boolean;
  booking?: Booking;
  photographer?: any;
  error?: string;
}> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const snap = await adminDb
      .collection('bookings')
      .where('quoteToken', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      return { success: false, error: 'Quote not found or expired' };
    }

    const bookingDoc = snap.docs[0];
    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

    // Fetch photographer public profile
    const profileSnap = await adminDb
      .collection('publicProfiles')
      .doc(booking.photographerId)
      .get();

    const photographer = profileSnap.exists ? profileSnap.data() : null;

    return { success: true, booking, photographer };
  } catch (error: any) {
    console.error('[GET_QUOTE]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCEPT QUOTE (Client with signature)
// ═══════════════════════════════════════════════════════════════

export async function acceptQuote(
  bookingId: string,
  approval: {
    signature: string;      // Base64 image
    typedName: string;
    agreedToTerms: boolean;
    deviceInfo?: string;
  }
): Promise<{
  success: boolean;
  invoiceNumber?: string;
  error?: string;
}> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const booking = bookingSnap.data() as Booking;

    if (!booking.quote) {
      return { success: false, error: 'Quote not found' };
    }

    if (booking.status !== 'quote_sent') {
      return { success: false, error: 'Quote already processed' };
    }

    // Create client approval record
    const clientApproval: ClientApproval = {
      signature: approval.signature,
      typedName: approval.typedName,
      agreedToTerms: approval.agreedToTerms,
      acceptedAt: new Date().toISOString(),
      deviceInfo: approval.deviceInfo || '',
      method: 'canvas_signature_v1',
    };

    // Generate Invoice from Quote
    const extrasTotal = (booking.quote.extras || []).reduce(
      (sum, e) => sum + (e.price || 0),
      0
    );

    const advanceSchedule = booking.quote.paymentSchedule?.[0];
    const advancePercent = advanceSchedule?.percentage || 30;

    const invoiceCalc = calculateInvoice(
      booking.quote.packageName,
      booking.quote.packagePrice,
      extrasTotal,
      advancePercent,
      7
    );

    // Count existing invoices for sequence
    const countSnap = await adminDb
      .collection('bookings')
      .where('invoice.invoiceNumber', '!=', null)
      .get();
    const sequence = countSnap.size + 1;

    const invoiceNumber = generateInvoiceNumber(sequence);

    // Build payment schedule with statuses
    const paymentSchedule: PaymentSchedule[] = (booking.quote.paymentSchedule || []).map(p => ({
      ...p,
      status: 'pending' as const,
    }));

    const invoice: Invoice = {
      invoiceNumber,
      ...invoiceCalc,
      paymentSchedule,
      dataDeliveryDate: booking.quote.dataDeliveryDate,
      dataDeliveryMethod: booking.quote.dataDeliveryMethod,
      termsAndConditions: booking.quote.termsAndConditions,
      cancellationPolicy: booking.quote.cancellationPolicy,
      status: 'sent',
    };

    // ✅ Advance deadline — photographer ne set ki hui dueDays
    const advanceDueDays = advanceSchedule?.dueDaysAfterAccept ?? 3;
    const advanceDeadline = new Date();
    advanceDeadline.setDate(advanceDeadline.getDate() + advanceDueDays);

    await bookingRef.update({
      clientApproval,
      invoice,
      status: 'invoice_sent',
      advanceDeadline: advanceDeadline.toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create notification for photographer
    await adminDb.collection('notifications').add({
      userId: booking.photographerId,
      type: 'quote_accepted',
      title: '✅ Quote Accepted!',
      body: `${booking.clientName} ne quote accept kar liya — Invoice ${invoiceNumber}`,
      link: '/dashboard/bookings',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error('[ACCEPT_QUOTE]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// REJECT QUOTE (Client)
// ═══════════════════════════════════════════════════════════════

export async function rejectQuote(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const booking = bookingSnap.data() as Booking;

    await bookingRef.update({
      status: 'quote_rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    });

    // Notify photographer
    await adminDb.collection('notifications').add({
      userId: booking.photographerId,
      type: 'quote_rejected',
      title: '❌ Quote Rejected',
      body: `${booking.clientName} ne quote reject kar diya — ${reason}`,
      link: '/dashboard/bookings',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[REJECT_QUOTE]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// REQUEST CHANGES (Client)
// ═══════════════════════════════════════════════════════════════

export async function requestQuoteChanges(
  bookingId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const booking = bookingSnap.data() as Booking;

    await bookingRef.update({
      status: 'quote_changes_requested',
      changesRequest: message,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection('notifications').add({
      userId: booking.photographerId,
      type: 'quote_changes',
      title: '🔄 Quote Changes Requested',
      body: `${booking.clientName} ne changes maange: ${message}`,
      link: '/dashboard/bookings',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[REQUEST_CHANGES]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MARK ADVANCE PAID (Photographer)
// ═══════════════════════════════════════════════════════════════

export async function markAdvancePaid(
  bookingId: string,
  method: string = 'other',
  reference: string = ''
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const booking = bookingSnap.data() as Booking;

    if (!booking.invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // Update payment schedule
    const updatedSchedule = (booking.invoice.paymentSchedule || []).map((p, idx) => {
      if (idx === 0) {
        return {
          ...p,
          status: 'paid' as const,
          paidAt: new Date().toISOString(),
          method,
          reference,
        };
      }
      return p;
    });

    const updatedInvoice: Invoice = {
      ...booking.invoice,
      paymentSchedule: updatedSchedule,
      status: 'partial_paid',
    };

    await bookingRef.update({
      invoice: updatedInvoice,
      status: 'advance_paid',
      advanceDeadline: null,
      updatedAt: new Date().toISOString(),
    });

    // Notify client (optional)
    // Note: Client ka koi user ID nahi hai, so we skip notification

    return { success: true };
  } catch (error: any) {
    console.error('[MARK_ADVANCE]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MARK PAYMENT PAID (Photographer — general)
// ═══════════════════════════════════════════════════════════════

export async function markPaymentPaid(
  bookingId: string,
  paymentIndex: number,
  method: string = 'other',
  reference: string = ''
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return { success: false, error: 'Booking not found' };
    }

    const booking = bookingSnap.data() as Booking;

    if (!booking.invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    const updatedSchedule = (booking.invoice.paymentSchedule || []).map((p, idx) => {
      if (idx === paymentIndex) {
        return {
          ...p,
          status: 'paid' as const,
          paidAt: new Date().toISOString(),
          method,
          reference,
        };
      }
      return p;
    });

    const allPaid = updatedSchedule.every(p => p.status === 'paid');

    const updatedInvoice: Invoice = {
      ...booking.invoice,
      paymentSchedule: updatedSchedule,
      status: allPaid ? 'paid' : 'partial_paid',
    };

    await bookingRef.update({
      invoice: updatedInvoice,
      status: allPaid ? 'completed' : booking.status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[MARK_PAYMENT]', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTO-CANCEL EXPIRED BOOKINGS (Cron)
// ═══════════════════════════════════════════════════════════════

export async function autoCancelExpiredBookings(): Promise<{
  success: boolean;
  cancelled: number;
  error?: string;
}> {
  if (!adminDb) return { success: false, cancelled: 0, error: 'DB offline' };

  try {
    const now = new Date().toISOString();

    // Find bookings with status "invoice_sent" and advance deadline passed
    const snap = await adminDb
      .collection('bookings')
      .where('status', '==', 'invoice_sent')
      .get();

    let cancelled = 0;

    for (const doc of snap.docs) {
      const booking = doc.data() as Booking;

      if (
        booking.advanceDeadline &&
        booking.advanceDeadline < now
      ) {
        await doc.ref.update({
          status: 'auto_cancelled',
          cancellation: {
            reason: 'Advance payment not received within deadline',
            cancelledAt: now,
            cancelledBy: 'system',
          },
          updatedAt: now,
        });

        // Notify photographer
        await adminDb.collection('notifications').add({
          userId: booking.photographerId,
          type: 'booking_auto_cancelled',
          title: '⚠️ Booking Auto-Cancelled',
          body: `${booking.clientName} ki booking cancel ho gayi — advance nahi mila`,
          link: '/dashboard/bookings',
          isRead: false,
          createdAt: now,
        });

        cancelled++;
      }
    }

    return { success: true, cancelled };
  } catch (error: any) {
    console.error('[AUTO_CANCEL]', error);
    return { success: false, cancelled: 0, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MANUAL CANCEL (Photographer)
// ═══════════════════════════════════════════════════════════════

export async function cancelBooking(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      status: 'manually_cancelled',
      cancellation: {
        reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'photographer',
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[CANCEL_BOOKING]', error);
    return { success: false, error: error.message };
  }
}