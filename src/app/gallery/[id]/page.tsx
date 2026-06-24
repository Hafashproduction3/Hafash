"use client";

import { useFirestore, useDoc } from '@/firebase';
import { useParams } from 'next/navigation';
import { Heart, Download, Camera, ShieldAlert, Loader2, X, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClientGalleryPage() {
  const params = useParams();
  const galleryParam = params?.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [searching, setSearching] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showLockDialog, setShowLockDialog] = useState(false);

  useEffect(() => {
    async function resolveGallery() {
      if (!firestore || !galleryParam) return;
      setSearching(true);
      try {
        const q = query(collection(firestore, 'galleries'), where('slug', '==', galleryParam));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const foundId = querySnapshot.docs[0].id;
          setGalleryId(foundId);
          updateDoc(doc(firestore, 'galleries', foundId), { viewCount: increment(1) });
        } else {
          setGalleryId(galleryParam);
        }
      } catch (err) {
        console.error("GALLERY_DEBUG: Resolution error:", err);
      } finally {
        setSearching(false);
      }
    }
    resolveGallery();
  }, [firestore, galleryParam]);

  const galleryRef = useMemo(() => {
    if (!firestore || !galleryId) return null;
    return doc(firestore, 'galleries', galleryId);
  }, [firestore, galleryId]);

  const { data: gallery, loading: docLoading } = useDoc(galleryRef);

  const handleFavorite = async (itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    try {
      const gRef = doc(firestore, 'galleries', galleryId);
      const updatedItems = gallery.items.map((item: any) => 
        item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
      );
      await updateDoc(gRef, { items: updatedItems });
      toast({ 
        title: isCurrentlyFavorite ? "Removed from Selection" : "Added to Selection", 
        description: "Your choices are synced with the photographer." 
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleDownloadAttempt = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (gallery?.isLocked) {
      setShowLockDialog(true);
      return;
    }
    window.open(url, '_blank');
  };

  const handleWhatsAppContact = () => {
    const message = `Hi, I'm viewing the "${gallery?.title}" gallery on Hafash.pk and I'd like to talk about the selection.`;
    window.open(`https://wa.me/923000000000?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (searching || docLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-primary font-bold italic tracking-widest uppercase text-xs">Curating Memories...</p>
      </div>
    );
  }

  if (!gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <ShieldAlert className="w-12 h-12 text-destructive mb-6" />
      <h1 className="text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">Gallery Not Found</h1>
      <Link href="/"><Button className="rounded-full px-10 bg-primary">Return Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      <div className="h-[75vh] relative overflow-hidden">
        <img src={gallery.coverImage} className="w-full h-full object-cover scale-105 filter blur-[2px] opacity-40" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="mb-6 h-px w-24 bg-primary/50" />
          <h1 className="text-4xl md:text-8xl font-headline font-bold mb-6 uppercase tracking-[0.2em] leading-tight">
            {gallery.title}
          </h1>
          <p className="text-xl md:text-2xl italic text-primary font-headline lowercase tracking-widest">
            {gallery.clientName} &bull; {gallery.category}
          </p>
          <div className="mt-8 flex gap-4">
            <Button className="rounded-full px-8 h-12 bg-primary font-bold gap-2" onClick={handleWhatsAppContact}>
              <MessageCircle className="w-4 h-4" /> Contact Studio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
        {!gallery.items || gallery.items.length === 0 ? (
          <div className="text-center py-40 bg-card/30 backdrop-blur-xl border border-dashed border-border/30 rounded-[3rem]">
             <Camera className="w-12 h-12 text-primary/20 mx-auto mb-6" />
             <p className="text-2xl text-muted-foreground font-headline italic">Your masterpieces are being prepared.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {gallery.items.map((item: any) => (
              <div 
                key={item.id} 
                className="relative group break-inside-avoid overflow-hidden rounded-[2rem] border border-border/10 bg-card/20 cursor-zoom-in shadow-2xl transition-all hover:border-primary/30"
                onClick={() => setSelectedImage(item.url)}
              >
                <img src={item.url} className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" alt="Gallery" />
                
                {/* Visual Watermark for Locked Galleries */}
                {gallery.isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none overflow-hidden">
                    <span className="text-primary font-headline text-4xl -rotate-45 whitespace-nowrap uppercase tracking-[1em]">HAFASH STUDIO</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-6">
                  <div className="flex gap-4">
                    <Button 
                      size="icon" 
                      className={cn(
                        "rounded-full h-14 w-14 backdrop-blur-xl transition-transform hover:scale-110",
                        item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
                      )} 
                      onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, !!item.isFavorite); }}
                    >
                      <Heart className={cn("w-6 h-6", item.isFavorite ? "fill-current" : "")} />
                    </Button>
                    <Button 
                      size="icon" 
                      className="rounded-full h-14 w-14 bg-white/10 backdrop-blur-xl text-white transition-transform hover:scale-110" 
                      onClick={(e) => handleDownloadAttempt(e, item.url)}
                    >
                      <Download className="w-6 h-6" />
                    </Button>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50">Experience Excellence</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg" alt="Fullscreen" />
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-primary hover:bg-primary/10 rounded-full h-12 w-12">
            <X className="w-8 h-8" />
          </Button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-md px-6 py-3 rounded-full border border-border/50 text-xs font-bold uppercase tracking-widest">
            Hafash Luxury Viewing
          </div>
        </div>
      )}

      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] p-12 shadow-2xl">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-4xl font-headline font-bold italic tracking-tighter">Premium Delivery</AlertDialogTitle>
            <AlertDialogDescription className="text-lg mt-4 leading-relaxed text-muted-foreground">
              Original quality downloads are currently restricted. Please contact your studio to finalize your package and unlock high-resolution access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex flex-col gap-4">
            <Button className="rounded-full h-14 w-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20" onClick={handleWhatsAppContact}>
              Contact Photographer
            </Button>
            <AlertDialogAction className="rounded-full h-12 w-full border-none bg-transparent text-muted-foreground hover:bg-background/50" onClick={() => setShowLockDialog(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}