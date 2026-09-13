import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { isOwnerAccount } from '@/lib/owner';
import { HAFASH_PLANS, type PlanId } from '@/lib/plans';

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
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Server-side check — never trust a client-side flag for this.
    if (!isOwnerAccount(decodedToken.email)) {
      return NextResponse.json(
        { error: 'Not authorized for owner activation.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const planId = body?.planId as PlanId;

    if (!planId || !HAFASH_PLANS[planId]) {
      return NextResponse.json(
        { error: 'Invalid plan.' },
        { status: 400 }
      );
    }

    // Far-future expiry acts as "unlimited" without needing a separate
    // code path everywhere else that checks planExpiryDate.
    const farFutureExpiry = new Date();
    farFutureExpiry.setFullYear(farFutureExpiry.getFullYear() + 100);

    await admin
      .firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .set(
        {
          planId,
          planExpiryDate: admin.firestore.Timestamp.fromDate(farFutureExpiry),
          planActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          planStatus: 'active',
          isOwnerAccount: true,
        },
        { merge: true }
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[OWNER ACTIVATE PLAN] Error:', error);

    return NextResponse.json(
      { error: 'Unable to activate plan.' },
      { status: 500 }
    );
  }
}