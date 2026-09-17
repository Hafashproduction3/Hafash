
"use client";

import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Heart, 
  Download, 
  Loader2, 
  MessageCircle, 
  Share2, 
  ShieldAlert,
  ArrowLeft,
  Send,
  CheckCircle2,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  X,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';

const TestGalleryItem = memo(({ 
  item, 
  showWatermark, 
  canDownload, 
  onFavorite, 
  onDownload, 
  onSelect,
  priority
}: { 
  item: any, 
  showWatermark: boolean, 
  canDownload: boolean, 
  onFavorite: (id: string) => void, 
  onDownload: (item: any) => void,
  onSelect: (url: string) => void,
  priority?: boolean
}) => {
  if (!item?.url) return null;

  return (
    <div 
      className="relative group break-inside-avoid overflow-hidden rounded-[2rem] border border-border/10 bg-card/20 cursor-zoom-in mb-8 shadow-xl transition-all duration-700 hover:shadow-primary/5" 
      onClick={() => onSelect(item.url)}
    >
      <img 
        src={item.url} 
        alt="Gallery Asset"
        className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110"
        loading={priority ? "eager" : "lazy"}
      />
      {showWatermark && <div className="luxury-watermark" />}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
        <div className="flex gap-4 scale-75 group-hover:scale-100 transition-transform duration-500">
          <Button 
            size="icon" 
            className={cn(
              "rounded-full h-16 w-16 border-none shadow-2xl transition-all", 
              item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
            )} 
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
          >
            <Heart className={cn("w-7 h-7", item.isFavorite ? "fill-current" : "")} />
          </Button>
          {canDownload && (
            <Button size="icon" className="rounded-full h-16 w-16 bg-white text-black hover:bg-gray-100 shadow-2xl transition-all" onClick={(e) => { e.stopPropagation(); onDownload(item); }}>
              <Download className="w-7 h-7" />
            </Button>
          )}
        </div>
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
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const event = useMemo(() => events.find(e => e.id === id), [events, id]);

  if (!isHydrated) {
    return <HafashLoader text="Accessing Test Vault..." />;
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-background">
        <div className="bg-destructive/10 p-10 rounded-full mb-10 ring-4 ring-destructive/5">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-4xl font-headline font-bold mb-6 text-white uppercase tracking-tighter">Test Vault Unavailable</h1>
        <p className="text-muted-foreground mb-12 max-w-sm mx-auto italic text-lg leading-relaxed">
          The requested test session is no longer active in this browser.
        </p>
        <Link href="/test-drive"><Button className="rounded-full px-12 h-14 bg-primary font-bold shadow-2xl">Return to Studio</Button></Link>
      </div>
    );
  }

  const showWatermark = event.isLocked || !event.isPaid;
  const canDownload = event.isPaid;

  const handleDownloadSingle = (item: any) => {
    toast({ title: "Simulation", description: "In test mode, downloading initiates a mock handshake." });
  };

  const handleDownloadAll = () => {
    setIsPreparing(true);
    setTimeout(() => {
      setIsPreparing(false);
      toast({ title: "Test Package Ready", description: "Full gallery zip compilation simulated." });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-1000">
      <div className="bg-primary text-primary-foreground text-center py-2 text-[9px] font-bold uppercase tracking-[0.5em] sticky top-0 z-[100] shadow-2xl">
        Public Preview Mode &bull; Test Drive Active
      </div>

      <Button 
        variant="ghost" size="icon" 
        className="fixed top-12 left-6 lg:top-16 lg:left-12 z-[60] h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-black/40 backdrop-blur-xl text-white border border-white/20 hover:bg-primary transition-all shadow-2xl"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-6 h-6 lg:w-7 lg:h-7" />
      </Button>

      {/* Luxury Hero */}
      <div className="h-[85vh] lg:h-[90vh] relative overflow-hidden flex flex-col items-center justify-center bg-card shadow-2xl">
        <img src={event.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105 animate-[slow-zoom_20s_infinite_alternate]" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl space-y-10">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/hafash-logo.png" className="h-[50px] w-auto drop-shadow-2xl" alt="Logo" />
              <span className="text-4xl sm:text-6xl lg:text-9xl font-headline font-bold text-white italic drop-shadow-2xl">Hafash.pk</span>
            </div>
            <span className="text-[10px] lg:text-[12px] font-bold tracking-[0.6em] text-primary/80 uppercase drop-shadow-lg">TEST GALLERY EXPERIENCE</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-headline font-bold text-white uppercase tracking-tight leading-[1.1] drop-shadow-2xl">{event.title}</h1>
            <p className="text-2xl lg:text-3xl italic text-primary font-headline drop-shadow-xl">{event.clientName}</p>
            <div className="flex items-center justify-center gap-6 text-white/80 uppercase tracking-[0.4em] text-[10px] lg:text-[12px] font-bold">
              <span>{event.category}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{event.date}</span>
            </div>
          </div>
          
          <div className="mt-14 lg:mt-20 flex flex-wrap justify-center items-center gap-4 lg:gap-6">
            <Button className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-4 shadow-2xl text-sm lg:text-base transition-all hover:scale-105" onClick={() => toast({ title: "Contact Module", description: "Studio communication interface simulated." })}>
              <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" /> Contact Studio
            </Button>

            {event.photographerNote && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-white/10 border border-white/20 text-white hover:bg-white/20 font-bold gap-4 shadow-2xl backdrop-blur-xl text-sm lg:text-base transition-all hover:scale-105">
                    <Sparkles className="w-5 h-5" /> Photographer's Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/50 rounded-[3rem] p-10 lg:p-16 shadow-2xl max-w-3xl overflow-hidden ring-1 ring-white/10">
                  <DialogHeader className="mb-10">
                    <div className="flex flex-col items-center text-center space-y-6">
                      <span className="text-2xl font-headline font-bold text-primary italic mb-2">Test Studio Flow</span>
                      <DialogTitle className="text-3xl lg:text-4xl font-headline font-bold uppercase tracking-tight leading-tight text-white">
                        Message From Your Photographer
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="space-y-10">
                    <p className="text-2xl lg:text-3xl font-headline italic leading-relaxed text-white/90 whitespace-pre-wrap text-center px-6">"{event.photographerNote}"</p>
                    <div className="flex justify-center">
                      <Button variant="outline" className={cn("rounded-full gap-3 font-bold transition-all h-12 px-8 border-primary/30 text-base shadow-lg", helpfulClicked ? "bg-primary text-primary-foreground border-primary" : "text-primary hover:bg-primary/10")} onClick={() => setHelpfulClicked(true)} disabled={helpfulClicked}>
                        <Heart className={cn("w-5 h-5", helpfulClicked && "fill-current")} />
                        {helpfulClicked ? "Helpful!" : "Appreciate this"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {canDownload && event.items?.length > 0 && (
              <Button 
                className={cn("flex-1 sm:w-auto rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-primary/20 border border-primary/40 text-white hover:bg-primary/30 font-bold gap-4 shadow-2xl backdrop-blur-xl text-sm lg:text-base transition-all", isPreparing && "opacity-70 cursor-wait")}
                onClick={handleDownloadAll}
                disabled={isPreparing}
              >
                {isPreparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                {isPreparing ? "Preparing..." : "Full Gallery Download"}
              </Button>
            )}

            <Button variant="outline" className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 border-white/30 text-white hover:bg-white/10 gap-4 backdrop-blur-xl text-sm lg:text-base transition-all" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied", description: "Gallery access link is ready to share." }); }}>
              <Share2 className="w-5 h-5 lg:w-6 lg:h-6" /> Share
            </Button>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-2 opacity-50">
           <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent" />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-24 space-y-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 lg:gap-12 space-y-12">
          {event.items?.map((item: any, idx: number) => (
            <TestGalleryItem 
              key={item.id}
              item={item}
              showWatermark={showWatermark}
              canDownload={canDownload}
              onFavorite={(itemId) => {
                toggleFavorite(id, itemId);
                toast({ title: "Moment Captured", description: "Simulation: Local state synchronized." });
              }}
              onDownload={handleDownloadSingle}
              onSelect={setSelectedImage}
              priority={idx < 2}
            />
          ))}
        </div>

        {(!event.items || event.items.length === 0) && (
          <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[4rem] bg-card/10">
             <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
             <p className="text-2xl text-muted-foreground font-headline italic">Waiting for simulation assets...</p>
          </div>
        )}
      </div>

      <footer className="mt-40 pt-24 border-t border-border/20 px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-12 opacity-40">
           <img src="/hafash-logo.png" alt="Hafash" className="h-10 w-auto grayscale brightness-200 mx-auto" />
           <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] italic">© 2026 Test Studio. Delivered by Hafash.pk</p>
        </div>
      </footer>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-500" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
            <img src={selectedImage} className="max-w-full max-h-[95vh] object-contain rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5" alt="Fullscreen" />
            {showWatermark && <div className="luxury-watermark" />}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 lg:top-12 lg:right-12 text-white h-12 w-12 lg:h-16 lg:w-16 hover:bg-primary hover:text-primary-foreground rounded-full transition-all shadow-2xl">
            <X className="w-8 h-8 lg:w-10 lg:h-10" />
          </Button>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
