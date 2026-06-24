
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
          // Try direct ID
          const directRef = doc(firestore, 'galleries', galleryParam);
          setGalleryId(galleryParam);
        }
      } catch (err) {
        console.error("GALLERY_DEBUG: Resolution error:", err);
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

  useEffect(() => {
    if (gallery) {
      console.log(`GALLERY_DEBUG: Loading gallery data`, {
        id: gallery.id,
        itemsFound: gallery.items?.length,
        items: gallery.items
      });
    }
  }, [gallery]);

  const handleFavorite = async (itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    try {
      const gRef = doc(firestore, 'galleries', galleryId);
      const updatedItems = gallery.items.map((item: any) => 
        item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
      );
      await updateDoc(gRef, { items: updatedItems });
      toast({ title: "Updated", description: isCurrentlyFavorite ? "Removed." : "Added." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
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

  if (searching || docLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading memories...</p>
      </div>
    );
  }

  if (!gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <ShieldAlert className="w-12 h-12 text-destructive mb-6" />
      <h1 className="text-3xl font-headline font-bold mb-4">Gallery Not Found</h1>
      <Link href="/"><Button className="rounded-full">Back to Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-[60vh] relative overflow-hidden">
        <img src={gallery.coverImage} className="w-full h-full object-cover scale-105 filter blur-[1px]" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl md:text-7xl font-headline font-bold mb-4 uppercase tracking-widest">{gallery.title}</h1>
          <p className="text-xl italic text-primary">{gallery.clientName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-20">
        {!gallery.items || gallery.items.length === 0 ? (
          <div className="text-center py-40 border border-dashed border-border/30 rounded-3xl">
             <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
             <p className="text-xl text-muted-foreground italic">Curation in progress...</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {gallery.items.map((item: any) => (
              <div 
                key={item.id} 
                className="relative group break-inside-avoid overflow-hidden rounded-3xl border border-border/10 bg-card/20 cursor-zoom-in"
                onClick={() => setSelectedImage(item.url)}
              >
                <img src={item.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" alt="Gallery" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button size="icon" className="rounded-full bg-white/20 backdrop-blur-md" onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, !!item.isFavorite); }}>
                    <Heart className={`w-5 h-5 ${item.isFavorite ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                  <Button size="icon" className="rounded-full bg-white/20 backdrop-blur-md" onClick={(e) => handleDownloadAttempt(e, item.url)}>
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain" alt="Fullscreen" />
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white"><X className="w-8 h-8" /></Button>
        </div>
      )}

      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-3xl p-10">
          <AlertDialogHeader className="text-center">
            <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
            <AlertDialogTitle className="text-3xl font-headline font-bold italic">Premium Gallery Access</AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              High-resolution downloads are currently restricted. Contact your studio to unlock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex-col sm:flex-row gap-4">
            <AlertDialogAction className="rounded-full h-12 flex-1">I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
