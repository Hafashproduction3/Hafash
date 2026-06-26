
"use client";

import { useFirestore, useDoc } from '@/firebase';
import { useParams } from 'next/navigation';
import { Heart, Download, Camera, ShieldAlert, Loader2, X, Lock, MessageCircle, Share2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ClientGalleryPage() {
  const params = useParams();
  const galleryParam = params?.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [searching, setSearching] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipMessage, setZipMessage] = useState("");
  
  const viewIncremented = useRef<string | null>(null);

  useEffect(() => {
    async function resolveGallery() {
      if (!firestore || !galleryParam) return;
      if (viewIncremented.current === galleryParam) return;

      setSearching(true);
      try {
        const q = query(collection(firestore, 'galleries'), where('slug', '==', galleryParam));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundId = querySnapshot.docs[0].id;
          setGalleryId(foundId);
          
          if (viewIncremented.current !== galleryParam) {
            viewIncremented.current = galleryParam;
            const gRef = doc(firestore, 'galleries', foundId);
            updateDoc(gRef, { viewCount: increment(1) }).catch(() => {});
          }
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

  const photographerRef = useMemo(() => {
    if (!firestore || !gallery?.userId) return null;
    return doc(firestore, 'users', gallery.userId);
  }, [firestore, gallery?.userId]);

  const { data: profile } = useDoc(photographerRef);

  // Core Access Logic
  const canDownload = useMemo(() => {
    return gallery ? (!gallery.isLocked && !!gallery.isPaid) : false;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const showWatermark = useMemo(() => {
    return gallery ? (!!gallery.isLocked || !gallery.isPaid) : true;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const handleFavorite = (itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    const gRef = doc(firestore, 'galleries', galleryId);
    const updatedItems = (gallery.items || []).map((item: any) => 
      item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
    );
    const updateData = { items: updatedItems };

    updateDoc(gRef, updateData)
      .then(() => {
        toast({ 
          title: isCurrentlyFavorite ? "Removed from Selection" : "Added to Selection", 
          description: "Your choices are synced with the photographer." 
        });
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: gRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Action Failed" });
        }
      });
  };

  const handleDownloadAttempt = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!canDownload) return;
    
    const downloadUrl = item.masterUrl || item.url;
    const filename = item.fileName || `${gallery?.title || 'hafash'}-${item.id}.jpg`;

    try {
      toast({ title: "Preparing Download", description: "Fetching high-resolution master file..." });
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleDownloadAll = async () => {
    if (isZipping || !gallery || !canDownload) return;
    
    setIsZipping(true);
    setZipMessage("Preparing your download package...");

    try {
      const zip = new JSZip();
      const items = gallery.items || [];
      
      if (items.length === 0) {
        toast({ title: "Empty Gallery", description: "There are no photos to download." });
        setIsZipping(false);
        return;
      }

      const downloadPromises = items.map(async (item: any, index: number) => {
        const originalUrl = item.masterUrl || item.url;
        const response = await fetch(originalUrl);
        if (!response.ok) throw new Error(`Failed to fetch original image ${index + 1}`);
        const blob = await response.blob();
        
        let extension = 'jpg';
        if (item.fileName && item.fileName.includes('.')) {
          extension = item.fileName.split('.').pop() || 'jpg';
        } else if (!originalUrl.includes('picsum.photos')) {
          extension = originalUrl.split('.').pop()?.split('?')[0] || 'jpg';
        }
        
        const fileName = item.fileName || `${gallery.title}-${index + 1}.${extension}`;
        zip.file(fileName, blob);
      });

      await Promise.all(downloadPromises);
      
      setZipMessage("Compressing masterpieces...");
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${gallery.title.replace(/\s+/g, '_')}_all_photos.zip`);

      toast({ 
        title: "Download Ready", 
        description: "Your masterpieces are ready. High-resolution originals delivered." 
      });
    } catch (error: any) {
      console.error("ZIP_ERROR:", error);
      toast({ 
        variant: "destructive", 
        title: "Download Failed", 
        description: "We encountered an error while preparing your original ZIP. Please try again." 
      });
    } finally {
      setIsZipping(false);
      setZipMessage("");
    }
  };

  const handleWhatsAppContact = () => {
    if (!profile?.whatsappNumber) {
      toast({
        variant: "destructive",
        title: "Configuration Incomplete",
        description: "The photographer hasn't configured their WhatsApp contact yet.",
      });
      return;
    }
    
    const whatsapp = profile.whatsappNumber.replace(/\D/g, '');
    const message = `Hi, I'm viewing the "${gallery?.title}" gallery on Hafash.pk and I'd like to discuss my selection.`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied", description: "Gallery link is ready to share." });
    }
  };

  const coverImageUrl = gallery?.coverImage || (gallery?.items && gallery.items.length > 0 ? gallery.items[0].url : 'https://picsum.photos/seed/hafash-empty/1920/1080');

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
      <div className="h-[85vh] relative overflow-hidden flex flex-col items-center justify-center bg-card">
        <img src={coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-85 brightness-90 transition-all duration-[3000ms] ease-out animate-in zoom-in-110" alt="Gallery Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        <div className="absolute inset-0 bg-black/10" />
        
        <div className="absolute top-12 left-0 right-0 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
          {profile?.studioLogo && (
            <img src={profile.studioLogo} className="h-16 md:h-20 w-auto mb-4 object-contain drop-shadow-2xl" alt="Studio Logo" />
          )}
          <span className="text-sm font-bold tracking-[0.5em] text-primary uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            {profile?.studioName || 'Professional Studio'}
          </span>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="mb-8 h-px w-16 md:w-24 bg-primary/80 mx-auto" />
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <span className="text-4xl md:text-9xl font-headline font-bold uppercase tracking-[0.1em] leading-tight text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] italic">Hafash.pk</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-headline font-bold mb-6 text-white uppercase tracking-tight">{gallery.title}</h1>
          <div className="space-y-4">
             <p className="text-xl md:text-4xl italic text-primary font-headline lowercase tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {gallery.clientName}
            </p>
            <div className="flex items-center justify-center gap-4 text-white uppercase tracking-[0.3em] text-[10px] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <span>{gallery.category}</span>
              <span className="h-1 w-1 bg-primary rounded-full" />
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <Button className="rounded-full px-8 md:px-10 h-14 bg-primary text-primary-foreground font-bold gap-3 shadow-2xl shadow-primary/20 hover:scale-105 transition-transform" onClick={handleWhatsAppContact}>
              <MessageCircle className="w-5 h-5" /> Contact Studio
            </Button>
            <Button variant="outline" className="rounded-full px-8 md:px-10 h-14 border-white/40 text-white hover:bg-white/10 gap-3 backdrop-blur-md shadow-xl" onClick={handleShare}>
              <Share2 className="w-5 h-5" /> Share Gallery
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 relative z-10">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-2xl font-headline font-bold uppercase tracking-widest">Masterpieces</h2>
          {canDownload && gallery.items && gallery.items.length > 0 && (
            <Button 
              className={cn(
                "rounded-full px-8 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bold gap-2",
                isZipping && "opacity-70 cursor-wait"
              )}
              onClick={handleDownloadAll}
              disabled={isZipping}
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isZipping ? zipMessage : "Download All Masterpieces"}
            </Button>
          )}
        </div>

        {!gallery.items || gallery.items.length === 0 ? (
          <div className="text-center py-40 bg-card/30 backdrop-blur-3xl border border-dashed border-border/30 rounded-[3rem] shadow-2xl">
             <Camera className="w-12 h-12 text-primary/20 mx-auto mb-6" />
             <p className="text-2xl text-muted-foreground font-headline italic">Your masterpieces are being prepared.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {gallery.items.map((item: any) => {
              const displayUrl = canDownload && item.masterUrl ? item.masterUrl : item.url;
              return (
                <div 
                  key={item.id} 
                  className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-border/10 bg-card/20 cursor-zoom-in shadow-2xl transition-all hover:border-primary/30" 
                  onClick={() => setSelectedImage(displayUrl)}
                >
                  <img src={item.url} className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" alt="Gallery" />
                  {showWatermark && (
                    <>
                      <div className="absolute inset-0 watermark-overlay pointer-events-none" />
                      <div className="watermark-text">HAFASH PREVIEW</div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-6 backdrop-blur-[2px]">
                    <div className="flex gap-4">
                      <Button size="icon" className={cn("rounded-full h-14 w-14 backdrop-blur-xl transition-transform hover:scale-110 shadow-xl", item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/10 text-white")} onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, !!item.isFavorite); }}>
                        <Heart className={cn("w-6 h-6", item.isFavorite ? "fill-current" : "")} />
                      </Button>
                      {canDownload && (
                        <Button size="icon" className="rounded-full h-14 w-14 bg-white/10 backdrop-blur-xl text-white transition-transform hover:scale-110 shadow-xl" onClick={(e) => handleDownloadAttempt(e, item)}>
                          <Download className="w-6 h-6" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/70">Luxury Experience</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto text-center mt-20 px-6 py-12 border-t border-border/20">
        <h3 className="text-2xl font-headline font-bold mb-4 text-primary">Crafted by {profile?.studioName || 'Professional Studio'}</h3>
        <p className="text-muted-foreground italic mb-8">Contact photographer for original high-resolution master files.</p>
        <Button className="rounded-full px-12 h-16 bg-primary font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform text-lg" onClick={handleWhatsAppContact}>
          Finalize My Selection
        </Button>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex items-center justify-center p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative">
            <img src={selectedImage} className="max-w-full max-h-[92vh] object-contain shadow-2xl rounded-2xl" alt="Fullscreen" />
            {showWatermark && <div className="watermark-text">HAFASH PREVIEW</div>}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-primary hover:bg-primary/10 rounded-full h-12 w-12 bg-background/50 backdrop-blur-md">
            <X className="w-8 h-8" />
          </Button>
        </div>
      )}
    </div>
  );
}
