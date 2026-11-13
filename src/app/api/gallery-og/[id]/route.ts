import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const FALLBACK_IMAGE = 'https://hafash.pk/hafash-logo.png';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!adminDb) {
      return new NextResponse('Database unavailable', { status: 503 });
    }

    // 1. Gallery fetch karein (ID ya Slug se)
    let snap = await adminDb.collection('galleries').doc(id).get();
    let data = snap.exists ? snap.data() : null;

    if (!data) {
      const result = await adminDb
        .collection('galleries')
        .where('slug', '==', id)
        .limit(1)
        .get();

      if (!result.empty) data = result.docs[0].data();
    }

    // 2. Security Check (Public aur Non-Password hona chahiye)
    const safe =
      data?.isPublic === true &&
      data?.isPasswordProtected !== true &&
      !data?.hashedPassword;

    if (!data || !safe) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    // 3. Cover Image URL (Ab kisi bhi domain se allow karein)
    const imageUrl =
      typeof data.coverImage === 'string' &&
      data.coverImage.startsWith('https://') // ✅ Sirf HTTPS check
        ? data.coverImage
        : null;

    if (!imageUrl) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    // 4. Image Fetch Karein
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!response.ok ||
        !(response.headers.get('content-type') || '').startsWith('image/')) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    const input = Buffer.from(await response.arrayBuffer());

    if (!input.length || input.length > 15 * 1024 * 1024) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    // 5. Sharp se Process Karein (Bina Cut Kiye)
    const output = await sharp(input, { limitInputPixels: 40000000 })
      .rotate()
      .resize(1200, 630, {
        fit: 'contain', // ✅ Image poori fit hogi, cut nahi hogi
        background: { r: 10, g: 10, b: 10, alpha: 1 }, // Kinare dark rahenge
        withoutEnlargement: false,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(output.length),
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Gallery OG image error:', error);
    return NextResponse.redirect(FALLBACK_IMAGE, 302);
  }
}