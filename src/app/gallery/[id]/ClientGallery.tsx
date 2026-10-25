import { Metadata } from 'next';
import ClientGallery from './ClientGallery';

// ✅ Yeh function WhatsApp ko preview dikhata hai (Server Side)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hafash.pk';
    
    const res = await fetch(`${baseUrl}/api/gallery-metadata/${id}`, { cache: 'no-store' });
    
    if (!res.ok) return { title: 'Hafash Gallery' };
    
    const data = await res.json();
    const title = `${data.title} - ${data.clientName}`;
    const description = `${data.category} gallery by ${data.studioName}. Powered by Hafash.pk`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: data.coverImage ? [{ url: data.coverImage, width: 1200, height: 630 }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: data.coverImage ? [data.coverImage] : [],
      },
    };
  } catch (err) {
    return { title: 'Hafash Gallery' };
  }
}

// ✅ Yeh aapki nayi client file ko load karega
export default function Page() {
  return <ClientGallery />;
}