
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import GalleryClient from './GalleryClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

// Current request ka Hafash domain identify karein
async function getBaseUrl(): Promise<string> {
  const headersList = await headers();

  const forwardedHost = headersList.get('x-forwarded-host');
  const regularHost = headersList.get('host');

  const host = (forwardedHost || regularHost || 'hafash.pk')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();

  // Sirf Hafash aur uske subdomains allow karein
  const isAllowedHost =
    host === 'hafash.pk' ||
    host === 'www.hafash.pk' ||
    host.endsWith('.hafash.pk');

  return isAllowedHost ? `https://${host}` : 'https://hafash.pk';
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = await getBaseUrl();

  const fallbackTitle = 'Hafash Wedding Gallery';
  const fallbackDescription =
    'Beautiful photography galleries, delivered by Hafash.pk.';

  try {
    // Gallery metadata Firebase API se fetch karein
    const response = await fetch(
      `${baseUrl}/api/gallery-metadata/${encodeURIComponent(id)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Gallery metadata API failed: ${response.status}`);
    }

    const data = await response.json();

    // Private ya password-protected gallery
    if (data.private) {
      const title = 'Private Gallery | Hafash.pk';
      const description =
        'A private photography gallery hosted on Hafash.pk.';

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `${baseUrl}/gallery/${encodeURIComponent(id)}`,
          siteName: 'Hafash.pk',
          type: 'website',
          images: [`${baseUrl}/hafash-logo.png`],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [`${baseUrl}/hafash-logo.png`],
        },
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    // Gallery information
    const clientName =
      typeof data.clientName === 'string'
        ? data.clientName.trim()
        : '';

    const studioName =
      typeof data.studioName === 'string' && data.studioName.trim()
        ? data.studioName.trim()
        : 'Professional Studio';

    const galleryTitle =
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : 'Wedding Gallery';

    const category =
      typeof data.category === 'string' && data.category.trim()
        ? data.category.trim()
        : 'Wedding Photography';

    const title = clientName
      ? `${galleryTitle} — ${clientName}`
      : `${galleryTitle} | ${studioName}`;

    const description =
      `${category} gallery by ${studioName}. Beautiful moments, delivered with Hafash.pk.`;

    // Processed 1200x630 OG image
    // Current domain/subdomain automatically use hoga
    const coverImage =
      `${baseUrl}/api/gallery-og/${encodeURIComponent(id)}`;

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
          },
        ],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [coverImage],
      },

      other: {
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
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
        url: `${baseUrl}/gallery/${encodeURIComponent(id)}`,
        siteName: 'Hafash.pk',
        type: 'website',
        images: [`${baseUrl}/hafash-logo.png`],
      },

      twitter: {
        card: 'summary_large_image',
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
