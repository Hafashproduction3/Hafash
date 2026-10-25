import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!adminDb) {
      return NextResponse.json({ error: 'DB offline' }, { status: 500 });
    }

    // 1. Gallery dhoondein (ID ya Slug se)
    let gallerySnap = await adminDb.collection('galleries').doc(id).get();
    let data = gallerySnap.exists ? gallerySnap.data() : null;

    if (!data) {
      const snap = await adminDb.collection('galleries').where('slug', '==', id).limit(1).get();
      if (!snap.empty) data = snap.docs[0].data();
    }

    if (!data) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // 2. Public Image URL banayein
    let imageUrl = 'https://hafash.pk/hafash-logo.png';
    if (data.coverKey) {
      imageUrl = `https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev/${data.coverKey}`;
    }

    return NextResponse.json({
      title: data.title || 'Hafash Gallery',
      clientName: data.clientName || '',
      coverImage: imageUrl,
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}