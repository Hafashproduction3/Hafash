import { NextResponse } from 'next/server';
import { safepay } from '@/lib/safepay';
import { admin } from '@/lib/firebase-admin';

const SAFEPAY_PLAN_IDS = {
  starter: 'plan_7f8cff7f-4e19-4dfe-a17d-5cc83b5e0511',
  pro: 'plan_72682b27-b3c2-44cf-98b5-43b9da2effcd',
  business: 'plan_06c27bc6-a7e7-4173-b815-9e7ad87badf2',
} as const;

type HafashPlanId = keyof typeof SAFEPAY_PLAN_IDS;

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
    const planId = body?.planId as HafashPlanId;

    if (!planId || !SAFEPAY_PLAN_IDS[planId]) {
      return NextResponse.json(
        { error: 'Invalid subscription plan.' },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;

    const checkoutUrl = await safepay.checkout.createSubscription({
      cancelUrl: `${origin}/checkout/${planId}/payment?cancelled=true`,
      redirectUrl: `${origin}/checkout/${planId}/payment?success=true`,
      planId: SAFEPAY_PLAN_IDS[planId],
      reference: `hafash_${userId}_${planId}_${Date.now()}`,
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
