import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import GalleryClient from './GalleryClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  // ✅ Cache Buster: Taake WhatsApp hamesha naya preview banaye
  const cacheBuster = Date.now();
  const ogImageUrl = `https://hafash.pk/api/gallery-og/${id}?v=${cacheBuster}`;

  try {
    if (!adminDb) throw new Error('DB not initialized');

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

    if (!data) throw new Error('Gallery not found');

    // Security Check
    const safe =
      data.isPublic === true &&
      data.isPasswordProtected !== true &&
      !data.hashedPassword;

    if (!safe) {
      return {
        title: 'Private Gallery | Hafash.pk',
        robots: { index: false, follow: false },
      };
    }

    // ✅ Data Extract Karein
    const clientName = data.clientName?.trim() || 'Client';
    const groomName = data.groomName?.trim() || '';
    const brideName = data.brideName?.trim() || '';
    const eventDate = data.date || '';
    const studioName = data.studioName?.trim() || 'Professional Studio';
    
    // ✅ Title: Client ka naam (Jaise aapne kaha)
    const title = clientName;
    
    // ✅ Description: Groom & Bride + Date
    let description = '';
    if (groomName && brideName) {
      description = `The Wedding Of ${groomName} & ${brideName} • ${eventDate}`;
    } else {
      description = `${studioName} • ${eventDate}`;
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://hafash.pk/gallery/${id}`,
        siteName: clientName, // ✅ Title ki tarah siteName bhi client ka naam
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
            type: 'image/jpeg',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error('Metadata error:', error);
    return {
      title: 'Hafash Wedding Gallery',
      description: 'Beautiful photography galleries, delivered by Hafash.pk.',
      openGraph: {
        title: 'Hafash Wedding Gallery',
        description: 'Beautiful photography galleries, delivered by Hafash.pk.',
        siteName: 'Hafash.pk',
        type: 'website',
        images: [`${ogImageUrl}`],
      },
    };
  }
}

export default function Page() {
  return <GalleryClient />;
}