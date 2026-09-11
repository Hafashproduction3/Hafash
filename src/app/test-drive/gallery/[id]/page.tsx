"use client";

import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Download, 
  Share2, 
  ArrowLeft,
  X,
  Camera,
  ShieldAlert,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const TestGalleryItem = memo(({ item, showWatermark, onFavorite }: { item: any, showWatermark: boolean, onFavorite: (id: string) => void }) => {
  return (
    <div className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-white/5 bg-card/20 mb-10 shadow-2xl transition-all duration-700">
      <img src={item.url} alt="Test" className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110" />
      {showWatermark && <div className="luxury-watermark" />}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-sm">
        <Button 
          size="icon" 
          className={cn(
            "rounded-full h-20 w-20 shadow-2xl transition-all", 
            item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
          )} 
          onClick={() => onFavorite(item.id)}
        >
          <Heart className={cn("w-8 h-8", item.isFavorite ? "fill-current" : "")} />
        </Button>
      </div>
    </div>
  );
});
TestGalleryItem.displayName = 'TestGalleryItem';

export default function TestDriveGalleryPage() {
  const params = useParams();
  const id = params?.id as string;
  const { events, toggleFavorite } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  
  const event = useMemo(() => events.find(e => e.id === id), [events, id]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 bg-background text-center">
        <ShieldAlert className="w-20 h-20 text-destructive mb-8 opacity-20" />
        <h1 className="text-4xl font-headline font-bold mb-4 uppercase">Test Session Unavailable</h1>
        <p className="text-muted-foreground mb-12">The requested test gallery does not exist in this browser session.</p>
        <Link href="/test-drive"><Button className="rounded-full px-12 h-14 bg-primary font-bold shadow-2xl">Return to Studio</Button></Link>
      </div>
    );
  }

  const showWatermark = event.isLocked || !event.isPaid;
  const canDownload = event.isPaid;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-1000">
      {/* Test Mode Indicator */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-[9px] font-bold uppercase tracking-[0.5em] sticky top-0 z-[100] shadow-2xl">
        Public Preview Mode &bull; Test Drive Active
      </div>

      <Button 
        variant="ghost" size="icon" 
        className="fixed top-12 left-6 lg:top-16 lg:left-12 z-[60] h-14 w-14 rounded-full bg-black/40 backdrop-blur-xl text-white border border-white/20 hover:bg-primary transition-all shadow-2xl"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-7 h-7" />
      </Button>

      {/* Luxury Hero */}
      <div className="h-[90vh] relative overflow-hidden flex flex-col items-center justify-center bg-card">
        <img src={event.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl space-y-12">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/hafash-logo.png" className="h-[60px] w-auto drop-shadow-2xl" alt="Logo" />
              <span className="text-5xl lg:text-9xl font-headline font-bold text-white italic drop-shadow-2xl">Hafash.pk</span>
            </div>
            <span className="text-[10px] lg:text-[12px] font-bold tracking-[0.6em] text-primary/80 uppercase">TEST GALLERY EXPERIENCE</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-9xl font-headline font-bold text-white uppercase tracking-tight leading-none drop-shadow-2xl">{event.title}</h1>
            <p className="text-3xl lg:text-4xl italic text-primary font-headline drop-shadow-xl">{event.clientName}</p>
            <div className="flex items-center justify-center gap-6 text-white/80 uppercase tracking-[0.4em] text-[10px] font-bold">
              <span>{event.category}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{event.date}</span>
            </div>
          </div>
          
          <div className="mt-20 flex flex-wrap justify-center items-center gap-6">
            <Button className="rounded-full px-12 h-16 bg-primary text-primary-foreground font-bold gap-4 shadow-2xl text-lg hover:scale-105 transition-all">
              <MessageSquare className="w-6 h-6" /> Contact Studio
            </Button>
            <Button variant="outline" className="rounded-full px-12 h-16 border-white/20 text-white hover:bg-white/10 gap-4 backdrop-blur-xl text-lg">
              <Share2 className="w-6 h-6" /> Share
            </Button>
          </div>
        </div>
      </div>

      {/* 3D Masonry-style Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-32 space-y-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-12">
          {event.items.map((item) => (
            <TestGalleryItem 
              key={item.id} 
              item={item} 
              showWatermark={showWatermark} 
              onFavorite={(itemId) => {
                toggleFavorite(id, itemId);
                toast({ title: "Moment Captured", description: "This photo has been added to your selections." });
              }} 
            />
          ))}
        </div>

        {event.items.length === 0 && (
          <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[4rem] bg-card/10 animate-pulse">
             <Camera className="w-20 h-20 text-muted-foreground/20 mx-auto mb-8" />
             <p className="text-3xl text-muted-foreground/40 font-headline italic">Preparing your visual experience...</p>
          </div>
        )}
      </div>

      <footer className="mt-60 pt-24 border-t border-white/5 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex flex-col items-center gap-8 opacity-40">
            <img src="/hafash-logo.png" alt="Hafash" className="h-10 w-auto grayscale brightness-200" />
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.4em] italic">© 2026 Test Studio. Delivered by Hafash.pk</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
