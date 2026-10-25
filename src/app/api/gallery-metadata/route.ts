import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const R2_PUBLIC_URL = 'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return NextResponse.json({ error: 'DB offline' }, { status: 500 });

    // 1. Pehle Direct ID se check karein
    let gallerySnap = await adminDb.collection('galleries').doc(id).get();
    let galleryData = gallerySnap.exists ? gallerySnap.data() : null;

    // 2. Agar ID se na mile, toh Slug se check karein
    if (!galleryData) {
      const slugSnap = await adminDb.collection('galleries').where('slug', '==', id).limit(1).get();
      if (!slugSnap.empty) {
        galleryData = slugSnap.docs[0].data();
      }
    }

    if (!galleryData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 3. R2 Public URL (jo WhatsApp pe load hogi)
    let coverUrl = '';
    if (galleryData.coverKey) {
      coverUrl = `${R2_PUBLIC_URL}/${galleryData.coverKey}`;
    }

    return NextResponse.json({
      title: galleryData.title || 'Hafash Gallery',
      clientName: galleryData.clientName || '',
      category: galleryData.category || 'Event',
      studioName: galleryData.studioName || 'Hafash Studio',
      coverImage: coverUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}