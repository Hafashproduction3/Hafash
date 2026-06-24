"use client";

import { useFirestore } from '@/firebase';
import { useParams } from 'next/navigation';
import { Heart, Download, Share2, Camera, ShieldAlert, Loader2, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
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
  
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showLockDialog, setShowLockDialog] = useState(false);

  useEffect(() => {
    async function fetchGallery() {
      if (!firestore || !galleryParam) return;
      
      setLoading(true);
      try {
        const docRef = doc(firestore, 'galleries', galleryParam);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { ...docSnap.data(), id: docSnap.id };
          setGallery(data);
          updateDoc(docRef, { viewCount: increment(1) });
        } else {
          const q = query(collection(firestore, 'galleries'), where('slug', '==', galleryParam));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const result = querySnapshot.docs[0];
            const data = { ...result.data(), id: result.id };
            setGallery(data);
            updateDoc(doc(firestore, 'galleries', result.id), { viewCount: increment(1) });
          } else {
            setGallery(null);
          }
        }
      } catch (error) {
        console.error("Fetch gallery error:", error);
        setGallery(null);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, [firestore, galleryParam]);

  const handleFavorite = async (itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery) return;
    
    try {
      const galleryRef = doc(firestore, 'galleries', gallery.id);
      const updatedItems = gallery.items.map((item: any) => 
        item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
      );
      
      await updateDoc(galleryRef, { items: updatedItems });
      setGallery({ ...gallery, items: updatedItems });
      
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
    link.download = `hafash-${gallery?.title || 'photo'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your memories...</p>
      </div>
    );
  }

  if (!gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="p-6 rounded-full bg-destructive/10 mb-6">
        <ShieldAlert className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-headline font-bold mb-4">Gallery Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">The link may be incorrect or the gallery has been removed.</p>
      <Link href="/"><Button className="rounded-full px-8">Back to Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-[65vh] relative overflow-hidden">
        <img 
          src={gallery.coverImage} 
          alt={gallery.title} 
          className="w-full h-full object-cover scale-105 filter blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="mb-8 p-6 rounded-full border border-primary/30 bg-background/20 backdrop-blur-xl">
            <Camera className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-8xl font-headline font-bold mb-6 tracking-[0.25em] uppercase leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">{gallery.title}</h1>
          <p className="text-xl md:text-3xl font-headline italic text-primary tracking-wide opacity-90">{gallery.clientName}</p>
          <div className="mt-10 flex gap-6">
             <div className="px-8 py-3 rounded-full border border-border/50 bg-background/40 backdrop-blur-md text-sm font-bold tracking-widest uppercase">
                {gallery.date}
             </div>
             <div className="px-8 py-3 rounded-full border border-border/50 bg-background/40 backdrop-blur-md text-sm font-bold tracking-widest uppercase">
                {gallery.category}
             </div>
          </div>
        </div>
      </div>

      {gallery.isLocked && (
        <div className="max-w-4xl mx-auto mt-[-40px] relative z-10 px-6 animate-in fade-in zoom-in duration-700">
          <div className="bg-primary/10 border border-primary/30 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 backdrop-blur-2xl shadow-2xl">
            <div className="p-5 bg-primary/20 rounded-2xl">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-headline font-bold text-primary mb-2 tracking-tight italic">Premium Gallery Selection</h3>
              <p className="text-muted-foreground text-lg">Original high-resolution downloads are currently restricted. Contact your studio to unlock full access.</p>
            </div>
            <Button variant="outline" className="rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all px-8 py-6 h-auto font-bold tracking-widest uppercase text-xs">
              Contact Studio
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-24">
        {gallery.items?.length === 0 ? (
          <div className="text-center py-32 bg-card/20 rounded-[3rem] border border-dashed border-border/40">
            <p className="text-xl text-muted-foreground italic font-headline">The artist is still curating your masterpieces...</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {gallery.items?.map((item: any) => (
              <div 
                key={item.id} 
                className="relative group break-inside-avoid overflow-hidden rounded-[2rem] border border-border/20 bg-card/30 shadow-2xl transition-all hover:border-primary/40"
                onClick={() => setSelectedImage(item.url)}
              >
                <div className="relative overflow-hidden cursor-zoom-in">
                  <img 
                    src={item.url} 
                    alt="Gallery Item" 
                    className="w-full h-auto object-cover transform transition-transform duration-1000 group-hover:scale-110"
                  />
                  {gallery.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="watermark-text text-2xl tracking-[0.5em] font-headline">HAFASH STUDIO</div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-6 right-6 flex gap-3">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className={`rounded-full h-12 w-12 bg-background/40 backdrop-blur-xl border border-white/10 hover:bg-primary transition-all duration-300 ${item.isFavorite ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-white'}`}
                        onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, item.isFavorite); }}
                      >
                        <Heart className={`w-6 h-6 ${item.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className={`rounded-full h-12 w-12 bg-background/40 backdrop-blur-xl border border-white/10 hover:bg-primary transition-all duration-300 text-white ${gallery.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={(e) => handleDownloadAttempt(e, item.url)}
                      >
                        <Download className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/98 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setSelectedImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 h-14 w-14">
            <X className="w-8 h-8" />
          </Button>
          
          <img src={selectedImage} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 rounded-xl" />
          
          <div className="mt-8 flex flex-col items-center">
            {gallery.isLocked ? (
              <div className="bg-primary/10 border border-primary/30 px-10 py-4 rounded-full backdrop-blur-xl">
                 <span className="text-primary font-headline italic text-lg tracking-wide uppercase font-bold">Premium Gallery — Contact Photographer for Original Quality</span>
              </div>
            ) : (
              <Button 
                onClick={(e) => handleDownloadAttempt(e, selectedImage)}
                className="rounded-full h-14 px-12 bg-primary text-primary-foreground font-bold tracking-[0.2em] uppercase text-xs"
              >
                Download Original File
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Professional Lock Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2rem] p-10 max-w-lg shadow-2xl">
          <AlertDialogHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-primary/10 rounded-2xl w-fit">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-3xl font-headline font-bold text-primary italic">Premium Gallery Access</AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-muted-foreground leading-relaxed">
              Original quality downloads are currently locked for this event. 
              Please contact your studio representative to finalize delivery and unlock high-resolution access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 sm:justify-center">
            <AlertDialogAction className="rounded-full h-14 px-12 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs shadow-lg shadow-primary/20">
              Acknowledged
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
