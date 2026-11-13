
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const FALLBACK_IMAGE = 'https://hafash.pk/hafash-logo.png';

const R2_PUBLIC_URL =
  'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

function fallback() {
  return NextResponse.redirect(FALLBACK_IMAGE, 302);
}

// Sirf trusted image domains allow karein
function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();

    return (
      hostname === 'pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev' ||
      hostname === 'hafash.pk' ||
      hostname.endsWith('.hafash.pk')
    );
  } catch {
    return false;
  }
}

// R2 object key ko safe URL mein convert karein
function getR2Url(key: string): string | null {
  const cleanKey = key.trim().replace(/^\/+/, '');

  if (
    !cleanKey ||
    cleanKey.includes('..') ||
    cleanKey.includes('\\')
  ) {
    return null;
  }

  const encodedKey = cleanKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${R2_PUBLIC_URL}/${encodedKey}`;
}

// Gallery cover image select karein
function getGalleryImageUrl(data: FirebaseFirestore.DocumentData): string | null {
  // 1. Thumbnail key ko priority
  if (typeof data.thumbKey === 'string' && data.thumbKey.trim()) {
    return getR2Url(data.thumbKey);
  }

  // 2. Existing cover image URL
  if (
    typeof data.coverImage === 'string' &&
    isAllowedImageUrl(data.coverImage)
  ) {
    return data.coverImage;
  }

  // 3. Cover object key
  if (typeof data.coverKey === 'string' && data.coverKey.trim()) {
    return getR2Url(data.coverKey);
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.length > 500) {
      return fallback();
    }

    // 1. Gallery Firebase se fetch karein
    let snap = await adminDb.collection('galleries').doc(id).get();
    let data = snap.exists ? snap.data() : null;

    // 2. ID nahi mili to slug se search karein
    if (!data) {
      const result = await adminDb
        .collection('galleries')
        .where('slug', '==', id)
        .limit(1)
        .get();

      if (!result.empty) {
        data = result.docs[0].data();
      }
    }

    // 3. Public gallery security check
    const safe =
      data?.isPublic === true &&
      data?.isPasswordProtected !== true &&
      !data?.hashedPassword;

    if (!data || !safe) {
      return fallback();
    }

    // 4. Cover image URL
    const imageUrl = getGalleryImageUrl(data);

    if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
      return fallback();
    }

    // 5. Image fetch karein, redirects allow nahi
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
      redirect: 'manual',
    });

    if (!response.ok) {
      return fallback();
    }

    const contentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase();

    if (!contentType.startsWith('image/')) {
      return fallback();
    }

    // 6. Download ke waqt size limit enforce karein
    const contentLength = Number(
      response.headers.get('content-length') || 0
    );

    if (contentLength > MAX_IMAGE_SIZE) {
      return fallback();
    }

    if (!response.body) {
      return fallback();
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalSize += value.length;

        if (totalSize > MAX_IMAGE_SIZE) {
          await reader.cancel();
          return fallback();
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    if (totalSize === 0) {
      return fallback();
    }

    const input = Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk))
    );

    // 7. Sharp se 1200x630 OG image banayein
    const output = await sharp(input, {
      limitInputPixels: 40000000,
    })
      .rotate()
      .resize(1200, 630, {
        fit: 'contain',
        background: {
          r: 10,
          g: 10,
          b: 10,
          alpha: 1,
        },
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toBuffer();

    // 8. WhatsApp ko JPEG image return karein
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
    return fallback();
  }
}
