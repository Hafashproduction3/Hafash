import { NextResponse } from 'next/server';
import { safepay } from '@/lib/safepay';
import { admin } from '@/lib/firebase-admin';
import { HAFASH_PLANS, type PlanId } from '@/lib/plans';

// NOTE: These prices must be in the smallest currency unit Safepay expects
// for PKR (paisa). If HAFASH_PLANS.price is a display string like "Rs. 2,500",
// you need a separate numeric amount field per plan (e.g. priceAmount: 2500).
// Below assumes HAFASH_PLANS[planId].priceAmount exists as a number in PKR.

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const idToken = authorization.substring('Bearer '.length).trim();

    if (!idToken) {
      return NextResponse.json(
        { error: 'Authentication token is missing.' },
        { status: 401 }
      );
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const planId = body?.planId as PlanId;

    const plan = HAFASH_PLANS[planId];

    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid subscription plan.' },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;

    // 1. Create a one-time payment intent (amount in PKR).
    //    Adjust `plan.priceAmount` to whatever numeric field holds
    //    the plan's price in your plans.ts file.
    const { token } = await safepay.payments.create({
      amount: plan.priceAmount, // e.g. 2500 for the 32GB plan
      currency: 'PKR',
    });

    // 2. Create the guest checkout link tied to that payment token.
    //    No Safepay account/login is required for the customer here.
    const checkoutUrl = safepay.checkout.create({
      token,
      orderId: `hafash_${userId}_${planId}_${Date.now()}`,
      cancelUrl: `${origin}/checkout/${planId}/payment?cancelled=true`,
      redirectUrl: `${origin}/checkout/${planId}/payment?success=true&plan=${planId}`,
      source: 'custom',
      webhooks: true,
    });

    if (typeof checkoutUrl !== 'string') {
      console.error(
        '[SAFEPAY CHECKOUT] Invalid checkout URL:',
        checkoutUrl
      );

      return NextResponse.json(
        { error: 'Safepay did not return a valid checkout URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error('[SAFEPAY CHECKOUT] Error:', error);

    if (
      error?.code === 'auth/id-token-expired' ||
      error?.code === 'auth/argument-error' ||
      error?.code === 'auth/invalid-id-token'
    ) {
      return NextResponse.json(
        { error: 'Your login session has expired. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Unable to create Safepay checkout.' },
      { status: 500 }
    );
  }
}