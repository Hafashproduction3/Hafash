import type { Metadata } from 'next';
import GalleryClient from './GalleryClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hafash.pk';

  const fallbackTitle = 'Hafash Wedding Gallery';
  const fallbackDescription = 'Beautiful photography galleries, delivered by Hafash.pk.';

  try {
    // API se data fetch karein
    const response = await fetch(
      `${baseUrl}/api/gallery-metadata/${encodeURIComponent(id)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        title: fallbackTitle,
        description: fallbackDescription,
        openGraph: {
          title: fallbackTitle,
          description: fallbackDescription,
          images: [`${baseUrl}/hafash-logo.png`],
        },
      };
    }

    const data = await response.json();

    if (data.private) {
      return {
        title: 'Private Gallery | Hafash.pk',
        description: 'A private photography gallery hosted on Hafash.pk.',
        openGraph: {
          title: 'Private Gallery | Hafash.pk',
          description: 'A private photography gallery hosted on Hafash.pk.',
          type: 'website',
          images: [`${baseUrl}/hafash-logo.png`],
        },
        robots: { index: false, follow: false },
      };
    }

    const clientName = typeof data.clientName === 'string' ? data.clientName.trim() : '';
    const studioName = typeof data.studioName === 'string' && data.studioName.trim()
      ? data.studioName.trim()
      : 'Professional Studio';
    const galleryTitle = typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : 'Wedding Gallery';
    const category = typeof data.category === 'string' && data.category.trim()
      ? data.category.trim()
      : 'Wedding Photography';

    const title = clientName ? `${galleryTitle} — ${clientName}` : `${galleryTitle} | ${studioName}`;
    const description = `${category} gallery by ${studioName}. Beautiful moments, delivered with Hafash.pk.`;
    
    // ✅ ASAL FIX: API se aane wali direct image use karein
    const coverImage = data.coverImage || `${baseUrl}/hafash-logo.png`;

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/gallery/${encodeURIComponent(id)}`,
        siteName: 'Hafash.pk',
        type: 'website',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: title,
            type: 'image/jpeg',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [coverImage],
      },
    };
  } catch (error) {
    console.error('Gallery metadata generation failed:', error);
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        images: [`${baseUrl}/hafash-logo.png`],
      },
    };
  }
}

export default function Page() {
  return <GalleryClient />;
}