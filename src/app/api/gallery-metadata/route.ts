import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const R2_PUBLIC_URL = 'https://pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!adminDb) return NextResponse.json({ error: 'DB offline' }, { status: 500 });

    // 1. ID ya Slug se Gallery dhoondein
    let gallerySnap = await adminDb.collection('galleries').doc(id).get();
    let galleryData = gallerySnap.exists ? gallerySnap.data() : null;

    if (!galleryData) {
      const slugSnap = await adminDb.collection('galleries').where('slug', '==', id).limit(1).get();
      if (!slugSnap.empty) galleryData = slugSnap.docs[0].data();
    }

    if (!galleryData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 2. Image ka Public URL banayein (IMPORTANT FIX)
    let coverUrl = '';
    
    // Agar coverKey mojood hai (jo sabse best hai)
    if (galleryData.coverKey) {
      coverUrl = `${R2_PUBLIC_URL}/${galleryData.coverKey}`;
    } 
    // Agar coverImage mojood hai lekin signed URL nahi hai
    else if (galleryData.coverImage && !galleryData.coverImage.includes('X-Amz')) {
      coverUrl = galleryData.coverImage;
    } 
    // Agar image bilkul nahi hai, toh Hafash ka default banner lagayein
    else {
      coverUrl = 'https://hafash.pk/hafash-banner.jpg'; // Aap yahan apni koi achi si default image ka link de sakte hain
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