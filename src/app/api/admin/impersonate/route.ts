import { NextResponse } from 'next/server';
import { admin, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { targetUserId, adminId } = await request.json();

    if (!targetUserId || !adminId || !admin) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Verify karein ke request bhejne wala waqai admin hai
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Target user ke liye custom token banayein
    const customToken = await admin.auth().createCustomToken(targetUserId);

    return NextResponse.json({ token: customToken });
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}