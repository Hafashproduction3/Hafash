import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();

    console.log('[SAFEPAY WEBHOOK] Received event:', body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[SAFEPAY WEBHOOK] Error:', error);

    return NextResponse.json(
      { received: false },
      { status: 500 }
    );
  }
}
