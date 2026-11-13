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
  
  const ogImageUrl = `https://hafash.pk/api/gallery-og/${id}`;

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

    // ✅ Yahan hum Groom & Bride ka naam nikal rahe hain
    const groomName = data.groomName?.trim() || 'Groom';
    const brideName = data.brideName?.trim() || 'Bride';
    const eventDate = data.date || '';
    
    // Title: "Ahmed & Bride" (Client Name hata diya)
    const title = `${groomName} & ${brideName}`;
    
    // Description: "The Wedding Of Ahmed & Bride • 2026-11-10"
    const description = `The Wedding Of ${groomName} & ${brideName} • ${eventDate}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: groomName + ' & ' + brideName, // Hafash ya Client ka naam nahi aayega
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