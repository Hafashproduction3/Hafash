import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const FALLBACK_IMAGE = 'https://hafash.pk/hafash-logo.png';
const R2_PUBLIC_URL = 'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: 'DB offline' }, { status: 500 });
    }

    let gallerySnap = await adminDb.collection('galleries').doc(id).get();
    let data = gallerySnap.exists ? gallerySnap.data() : null;

    if (!data) {
      const snap = await adminDb
        .collection('galleries')
        .where('slug', '==', id)
        .limit(1)
        .get();

      if (!snap.empty) {
        data = snap.docs[0].data();
      }
    }

    if (!data) {
      return NextResponse.json(
        {
          title: 'Hafash Gallery',
          description: 'Beautiful photography galleries by Hafash.pk',
          coverImage: FALLBACK_IMAGE,
          clientName: '',
          category: 'Photography',
          studioName: 'Hafash.pk',
          private: true,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Private ya password-protected galleries ki details expose na karein.
    const isSafeToPreview =
      data.isPublic === true &&
      data.isPasswordProtected !== true &&
      !data.hashedPassword;

    if (!isSafeToPreview) {
      return NextResponse.json(
        {
          title: 'Private Photography Gallery',
          description: 'A private gallery hosted on Hafash.pk.',
          coverImage: FALLBACK_IMAGE,
          clientName: '',
          category: 'Photography',
          studioName: 'Hafash.pk',
          private: true,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let imageUrl = FALLBACK_IMAGE;

    // ✅ ASAL FIX: WhatsApp ke liye chhoti Thumbnail use karein
    if (typeof data.thumbKey === 'string' && data.thumbKey) {
      imageUrl = `${R2_PUBLIC_URL}/${data.thumbKey
        .split('/')
        .map((part: string) => encodeURIComponent(part))
        .join('/')}`;
    } else if (typeof data.coverImage === 'string' && data.coverImage.startsWith('https://') && !data.coverImage.includes('X-Amz')) {
      imageUrl = data.coverImage;
    } else if (typeof data.coverKey === 'string' && data.coverKey) {
      imageUrl = `${R2_PUBLIC_URL}/${data.coverKey
        .split('/')
        .map((part: string) => encodeURIComponent(part))
        .join('/')}`;
    }

    return NextResponse.json(
      {
        title: data.title || 'Wedding Gallery',
        clientName: data.clientName || '',
        category: data.category || 'Photography',
        studioName: data.studioName || 'Professional Studio',
        coverImage: imageUrl,
        private: false,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Gallery metadata error:', error);

    return NextResponse.json(
      { error: 'Unable to load gallery metadata' },
      { status: 500 }
    );
  }
}