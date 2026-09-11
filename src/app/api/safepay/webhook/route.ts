import { NextResponse } from 'next/server';
import { safepay } from '@/lib/safepay';
import { admin } from '@/lib/firebase-admin';

// IMPORTANT: The exact shape of Safepay's webhook payload (field names like
// `type`, `data.state`, `data.tracker.order_id`, etc.) is NOT confirmed from
// documentation here. Once you trigger a real test payment in the Safepay
// sandbox, check the Vercel/server logs for the actual JSON this endpoint
// receives (the console.log below will print it), and adjust the field
// names in `eventType`, `isPaid`, and `orderId` below to match exactly what
// Safepay actually sends. Do not assume this works until you've seen a real
// sandbox webhook payload and confirmed the plan activates correctly.

export async function POST(request: Request) {
  try {
    // Clone the request because we need to read the body twice:
    // once (raw) for signature verification, once (as JSON) for our logic.
    const clonedRequest = request.clone();

    const isValid = await safepay.verify.webhook(request);

    if (!isValid) {
      console.error('[SAFEPAY WEBHOOK] Invalid signature — rejecting event');
      return NextResponse.json({ received: false }, { status: 401 });
    }

    const event = await clonedRequest.json();

    console.log('[SAFEPAY WEBHOOK] Verified event payload:', JSON.stringify(event));

    // --- Adjust these three lines after inspecting a real payload ---
    const eventType: string | undefined = event?.type || event?.event;
    const isPaid =
      eventType === 'payment.succeeded' ||
      eventType === 'charge.succeeded' ||
      event?.data?.state === 'PAID' ||
      event?.data?.status === 'PAID';
    const orderId: string | undefined =
      event?.data?.tracker?.order_id ||
      event?.data?.order_id ||
      event?.order_id;
    // ------------------------------------------------------------------

    if (!isPaid || !orderId) {
      console.log('[SAFEPAY WEBHOOK] Ignoring event (not a paid state or no orderId found):', {
        eventType,
        orderId,
      });
      return NextResponse.json({ received: true });
    }

    // orderId was created as: hafash_{userId}_{planId}_{timestamp}
    const parts = orderId.split('_');

    if (parts.length < 4 || parts[0] !== 'hafash') {
      console.error('[SAFEPAY WEBHOOK] Unrecognized orderId format:', orderId);
      return NextResponse.json({ received: true });
    }

    const userId = parts[1];
    const planId = parts[2];

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .set(
        {
          planId,
          planExpiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
          planActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          planStatus: 'active',
        },
        { merge: true }
      );

    console.log(
      `[SAFEPAY WEBHOOK] Activated plan "${planId}" for user ${userId}, expires ${expiryDate.toISOString()}`
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[SAFEPAY WEBHOOK] Error:', error);

    return NextResponse.json({ received: false }, { status: 500 });
  }
}