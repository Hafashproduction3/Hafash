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

    const safe =
      data?.isPublic === true &&
      data?.isPasswordProtected !== true &&
      !data?.hashedPassword;

    if (!data || !safe) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    const imageUrl =
      typeof data.coverImage === 'string' &&
      data.coverImage.startsWith('https://hafash-storage.9f6e5afede18c219a4b2bf07af49d55f.r2.cloudflarestorage.com/')
        ? data.coverImage
        : null;

    if (!imageUrl) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

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

    const output = await sharp(input, { limitInputPixels: 40000000 })
      .rotate()
      .resize(1200, 630, {
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 72, mozjpeg: true })
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
