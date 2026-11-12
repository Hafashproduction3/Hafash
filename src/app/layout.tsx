import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Hafash.pk | Deliver Memories Beautifully',
  description: 'The luxury gallery delivery platform for photographers.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* ✅ 20+ Premium Fonts for Hero Designer & Watermarks */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;700;900&family=Parisienne&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Raleway:wght@400;700;900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" 
          rel="stylesheet" 
        />
        <meta name="theme-color" content="#1A1916" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background text-foreground">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}