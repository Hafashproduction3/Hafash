
"use client";

import { useFirestore, useDoc } from '@/firebase';
import { useParams } from 'next/navigation';
import { Heart, Download, Camera, ShieldAlert, Loader2, X, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import Link from 'next/link';
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

  // Resolve ID from slug if necessary
  useEffect(() => {
    async function resolveGallery() {
      if (!firestore || !galleryParam) return;
      setSearching(true);
      try {
        // Try direct ID first
        const directRef = doc(firestore, 'galleries', galleryParam);
        const directSnap = await getDocs(query(collection(firestore, 'galleries'), where('__name__', '==', galleryParam)));
        
        if (!directSnap.empty) {
          setGalleryId(galleryParam);
          updateDoc(doc(firestore, 'galleries', galleryParam), { viewCount: increment(1) });
        } else {
          // Fallback to slug
          const q = query(collection(firestore, 'galleries'), where('slug', '==', galleryParam));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setGalleryId(querySnapshot.docs[0].id);
            updateDoc(doc(firestore, 'galleries', querySnapshot.docs[0].id), { viewCount: increment(1) });
          } else {
            setGalleryId(null);
          }
        }
      } catch (err) {
        console.error("Gallery resolution error:", err);
        setGalleryId(null);
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
        title: "Preference Updated",
        description: isCurrentlyFavorite ? "Removed from favorites." : "Added to favorites.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update status.",
      });
    }
  };

  const handleDownloadAttempt = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (gallery?.isLocked) {
      setShowLockDialog(true);
      return;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.target = "_blank";
    link.download = `hafash-${gallery?.title || 'photo'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleContactStudio = () => {
    const phoneNumber = "923330000000"; 
    const studioName = gallery?.title || "your studio";
    const message = encodeURIComponent(`Hi, I'm viewing the "${studioName}" gallery on Hafash.pk and would like to request download access for high-resolution images.`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  if (searching || docLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">Loading your luxury memories...</p>
      </div>
    );
  }

  if (!gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="p-6 rounded-full bg-destructive/10 mb-6">
        <ShieldAlert className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-headline font-bold mb-4">Gallery Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">The link may be incorrect or the private access has been revoked.</p>
      <Link href="/"><Button className="rounded-full px-8 bg-primary text-primary-foreground font-bold">Back to Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-[75vh] relative overflow-hidden">
        <img 
          src={gallery.coverImage} 
          alt={gallery.title} 
          className="w-full h-full object-cover scale-105 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="mb-8 p-6 rounded-full border border-primary/30 bg-background/20 backdrop-blur-3xl animate-in zoom-in duration-1000">
            <Camera className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-8xl font-headline font-bold mb-6 tracking-[0.2em] uppercase leading-tight animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {gallery.title}
          </h1>
          <p className="text-xl md:text-3xl font-headline italic text-primary tracking-widest opacity-90 animate-in fade-in duration-1000 delay-300">
            {gallery.clientName}
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
             <div className="px-10 py-3 rounded-full border border-border/50 bg-background/40 backdrop-blur-md text-sm font-bold tracking-widest uppercase">
                {gallery.date}
             </div>
             <div className="px-10 py-3 rounded-full border border-border/50 bg-background/40 backdrop-blur-md text-sm font-bold tracking-widest uppercase text-primary">
                {gallery.category}
             </div>
          </div>
        </div>
      </div>

      {gallery.isLocked && (
        <div className="max-w-4xl mx-auto mt-[-40px] relative z-10 px-6 animate-in fade-in zoom-in duration-700">
          <div className="bg-card/80 border border-primary/30 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
            <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1 space-y-2">
              <h3 className="text-3xl font-headline font-bold text-primary tracking-tight italic">Premium Gallery Selection</h3>
              <p className="text-muted-foreground text-lg">Original high-resolution downloads are currently restricted. Contact your studio to unlock the full masterpiece.</p>
            </div>
            <Button 
              variant="outline" 
              className="rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all px-10 py-8 h-auto font-bold tracking-[0.2em] uppercase text-xs gap-3"
              onClick={handleContactStudio}
            >
              <MessageCircle className="w-5 h-5" />
              Contact Studio
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-32">
        {!gallery.items || gallery.items.length === 0 ? (
          <div className="text-center py-48 bg-card/10 rounded-[4rem] border border-dashed border-border/30">
            <Camera className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <p className="text-2xl text-muted-foreground italic font-headline opacity-60">The artist is still curating your masterpieces...</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-10 space-y-10">
            {gallery.items.map((item: any, idx: number) => {
              const imageUrl = item.url;
              const itemId = item.id || `item-${idx}`;
              
              if (!imageUrl) return null;

              return (
                <div 
                  key={itemId} 
                  className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-border/10 bg-card/20 shadow-2xl transition-all duration-700 hover:border-primary/40 hover:shadow-primary/5"
                  onClick={() => setSelectedImage(imageUrl)}
                >
                  <div className="relative overflow-hidden cursor-zoom-in">
                    <img 
                      src={imageUrl} 
                      alt={`Gallery Item ${idx + 1}`} 
                      className="w-full h-auto object-cover transform transition-transform duration-[2000ms] ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                    {gallery.isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                        <div className="watermark-text text-3xl tracking-[1em] font-headline select-none">HAFASH STUDIO</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-background/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-center gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className={`rounded-full h-16 w-16 bg-background/40 backdrop-blur-3xl border border-white/10 hover:bg-primary transition-all duration-500 ${item.isFavorite ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/40' : 'text-white'}`}
                          onClick={(e) => { e.stopPropagation(); handleFavorite(itemId, !!item.isFavorite); }}
                        >
                          <Heart className={`w-7 h-7 ${item.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className={`rounded-full h-16 w-16 bg-background/40 backdrop-blur-3xl border border-white/10 hover:bg-primary transition-all duration-500 text-white ${gallery.isLocked ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:scale-110'}`}
                          onClick={(e) => handleDownloadAttempt(e, imageUrl)}
                        >
                          <Download className="w-7 h-7" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/98 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setSelectedImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 h-16 w-16 transition-all">
            <X className="w-10 h-10" />
          </Button>
          
          <img 
            src={selectedImage} 
            alt="Fullscreen" 
            className="max-w-full max-h-[80vh] object-contain shadow-[0_0_120px_rgba(0,0,0,0.8)] border border-white/5 rounded-2xl" 
          />
          
          <div className="mt-12 flex flex-col items-center space-y-6">
            {gallery.isLocked ? (
              <div className="bg-primary/10 border border-primary/30 px-12 py-5 rounded-full backdrop-blur-3xl animate-in slide-in-from-bottom-4">
                 <span className="text-primary font-headline italic text-xl tracking-widest uppercase font-bold">Premium High-Res Restricted</span>
              </div>
            ) : (
              <Button 
                onClick={(e) => handleDownloadAttempt(e, selectedImage)}
                className="rounded-full h-16 px-16 bg-primary text-primary-foreground font-bold tracking-[0.3em] uppercase text-xs shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                Download Original Quality
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-[10px]"
              onClick={() => setSelectedImage(null)}
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}

      {/* Professional Lock Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[3rem] p-12 max-w-xl shadow-[0_40px_80px_-12px_rgba(0,0,0,0.8)]">
          <AlertDialogHeader className="text-center space-y-6">
            <div className="mx-auto p-6 bg-primary/10 rounded-[2rem] w-fit border border-primary/20">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-4xl font-headline font-bold text-primary italic tracking-tight">Premium Gallery Access</AlertDialogTitle>
            <AlertDialogDescription className="text-xl text-muted-foreground leading-relaxed">
              Original high-resolution downloads are locked for this event to preserve image integrity during the selection process. 
              <br /><br />
              Please contact your studio representative to finalize your selection and unlock full-quality access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-12 sm:justify-center gap-4">
            <AlertDialogAction className="rounded-full h-16 px-12 bg-primary text-primary-foreground font-bold tracking-[0.2em] uppercase text-xs shadow-2xl shadow-primary/20 hover:bg-primary/90 flex-1">
              I Understand
            </AlertDialogAction>
            <Button 
              variant="outline" 
              className="rounded-full h-16 px-12 border-primary text-primary font-bold tracking-[0.2em] uppercase text-xs flex-1"
              onClick={handleContactStudio}
            >
              Contact Studio
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
