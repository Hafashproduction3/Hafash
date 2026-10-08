import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safepay } from '@/lib/safepay';
import { admin } from '@/lib/firebase-admin';
import { HAFASH_PLANS, type PlanId } from '@/lib/plans';
import { sendPaymentReceiptEmail } from '@/lib/email/sendPaymentReceipt';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody);

    const signature = request.headers.get('x-sfpy-signature');
    const data = Buffer.from(JSON.stringify(event.data));

    const expectedSignature = crypto
      .createHmac('sha512', process.env.SAFEPAY_WEBHOOK_SECRET!)
      .update(data)
      .digest('hex');

    const isValid = !!signature && signature === expectedSignature;

    if (!isValid) {
      console.error('[SAFEPAY WEBHOOK] Invalid signature — rejecting event');
      return NextResponse.json({ received: false }, { status: 401 });
    }

    console.log(
      '[SAFEPAY WEBHOOK] Verified event payload:',
      JSON.stringify(event)
    );

    // ✅ SANDBOX CHECK — test payments ignore karo
    const safepayEnv = process.env.SAFEPAY_ENV || 'production';
    const isSandbox = safepayEnv === 'sandbox' || safepayEnv === 'development';

    if (isSandbox) {
      console.log('[SAFEPAY WEBHOOK] 🚫 SANDBOX MODE — plan NOT activated');
      console.log('[SAFEPAY WEBHOOK] Env:', safepayEnv);
      console.log('[SAFEPAY WEBHOOK] Payment ignored for production safety');
      return NextResponse.json({ 
        received: true, 
        message: 'Sandbox payment — no plan activation' 
      });
    }

    const eventType: string | undefined =
      event?.type || event?.event;

    const isPaid =
      eventType === 'payment.succeeded' ||
      eventType === 'charge.succeeded' ||
      event?.data?.state === 'PAID' ||
      event?.data?.status === 'PAID';

    const orderId: string | undefined =
      event?.data?.tracker?.order_id ||
      event?.data?.order_id ||
      event?.order_id;

    if (!isPaid || !orderId) {
      console.log(
        '[SAFEPAY WEBHOOK] Ignoring event:',
        {
          eventType,
          orderId,
        }
      );

      return NextResponse.json({ received: true });
    }

    // Order ID:
    // hafash_{userId}_{planId}_{timestamp}
    const parts = orderId.split('_');

    if (parts.length < 4 || parts[0] !== 'hafash') {
      console.error(
        '[SAFEPAY WEBHOOK] Unrecognized orderId format:',
        orderId
      );

      return NextResponse.json({ received: true });
    }

    const userId = parts[1];
    const planId = parts[2] as PlanId;

    const plan = HAFASH_PLANS[planId];

    if (!plan) {
      console.error(
        '[SAFEPAY WEBHOOK] Unknown plan:',
        planId
      );

      return NextResponse.json({ received: true });
    }

    // Activate plan
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .set(
        {
          planId,
          planExpiryDate:
            admin.firestore.Timestamp.fromDate(expiryDate),
          planActivatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
          planStatus: 'active',
        },
        { merge: true }
      );

    console.log(
      `[SAFEPAY WEBHOOK] ✅ LIVE PAYMENT — Activated plan "${planId}" for user ${userId}, expires ${expiryDate.toISOString()}`
    );

    // Send genuine payment receipt email
    try {
      const userRecord = await admin.auth().getUser(userId);

      const email = userRecord.email;

      if (!email) {
        console.error(
          '[SAFEPAY WEBHOOK] User has no email. Receipt not sent.'
        );
      } else {
        const userName =
          userRecord.displayName ||
          email.split('@')[0] ||
          'Hafash User';

        const paymentDate = new Date().toLocaleString('en-PK', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Karachi',
        });

        const receiptResult = await sendPaymentReceiptEmail({
          to: email,
          userName,
          planName: plan.name,
          amount: plan.priceAmount,
          orderId,
          paymentDate,
        });

        if (!receiptResult.success) {
          console.error(
            '[SAFEPAY WEBHOOK] Receipt email failed:',
            receiptResult.error
          );
        } else {
          console.log(
            `[SAFEPAY WEBHOOK] ✅ Payment receipt sent to ${email}`
          );
        }
      }
    } catch (emailError) {
      console.error(
        '[SAFEPAY WEBHOOK] Could not send payment receipt:',
        emailError
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[SAFEPAY WEBHOOK] Error:', error);

    return NextResponse.json(
      { received: false },
      { status: 500 }
    );
  }
}