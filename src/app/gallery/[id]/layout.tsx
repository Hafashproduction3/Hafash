import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const galleryId = params.id;
  
  try {
    if (!adminDb) return { title: 'Hafash Gallery' };

    // 1. Fetch Gallery Data
    let docSnap = await adminDb.collection('galleries').doc(galleryId).get();
    if (!docSnap.exists) {
      const slugSnap = await adminDb.collection('galleries').where('slug', '==', galleryId.toLowerCase()).limit(1).get();
      if (!slugSnap.empty) docSnap = slugSnap.docs[0];
    }

    if (!docSnap.exists) return { title: 'Gallery Not Found' };

    const data = docSnap.data();
    const studioName = data?.studioName || 'Hafash Studio';
    const title = data?.title || 'A Beautiful Gallery';
    
    // ✅ OG Image API URL (Hamesha main domain se serve karein, subdomain se nahi)
    const ogImageUrl = `https://hafash.pk/api/gallery-og/${galleryId}`;

    // ✅ Jab WhatsApp link kholega, woh subdomain par jayega
    // Lekin image main domain se aayegi
    return {
      title: title,
      description: `A beautiful gallery by ${studioName}.`,
      metadataBase: new URL('https://hafash.pk'), // ✅ Base URL main domain
      openGraph: {
        title: title,
        description: `A beautiful gallery by ${studioName}.`,
        siteName: studioName, // ✅ Hafash ka naam nahi, photographer ka naam
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: `A beautiful gallery by ${studioName}.`,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    return { title: 'Hafash Gallery' };
  }
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}