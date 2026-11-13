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
  
  const fallbackTitle = 'Hafash Wedding Gallery';
  const fallbackDescription = 'Beautiful photography galleries, delivered by Hafash.pk.';
  const ogImageUrl = `https://hafash.pk/api/gallery-og/${id}`;

  try {
    if (!adminDb) throw new Error('DB not initialized');

    // ✅ Direct Firebase Admin se fetch karein (API call nahi)
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

    // ✅ Private gallery security check
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

    const clientName = data.clientName?.trim() || '';
    const studioName = data.studioName?.trim() || 'Professional Studio';
    const galleryTitle = data.title?.trim() || 'Wedding Gallery';
    const category = data.category?.trim() || 'Wedding Photography';

    const title = clientName ? `${galleryTitle} — ${clientName}` : `${galleryTitle} | ${studioName}`;
    const description = `${category} gallery by ${studioName}. Beautiful moments, delivered with Hafash.pk.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: studioName, // ✅ Hafash nahi, Studio ka naam
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
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
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