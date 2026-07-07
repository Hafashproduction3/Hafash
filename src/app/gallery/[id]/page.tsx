
"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Download, 
  Loader2, 
  X, 
  Lock, 
  MessageCircle, 
  Share2, 
  ShieldAlert,
  Globe,
  Clock,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HAFASH_PLANS, DEFAULT_PLAN, estimateZipSizeGb, type PlanId } from '@/lib/plans';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Memoized Gallery Item to prevent unnecessary re-renders in large lists
const GalleryItem = memo(({ 
  item, 
  showWatermark, 
  canDownload, 
  onFavorite, 
  onDownload, 
  onSelect 
}: { 
  item: any, 
  showWatermark: boolean, 
  canDownload: boolean, 
  onFavorite: (id: string, current: boolean) => void, 
  onDownload: (item: any) => void,
  onSelect: (url: string) => void
}) => {
  return (
    <div 
      className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-border/10 bg-card/20 cursor-zoom-in" 
      onClick={() => onSelect(item.url)}
    >
      <Image 
        src={item.url} 
        alt="Gallery Asset"
        width={800}
        height={600}
        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        style={{ height: 'auto' }}
        priority={false}
      />
      {showWatermark && <div className="watermark-text">HAFASH PREVIEW</div>}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <Button 
            size="icon" 
            className={cn("rounded-full h-12 w-12 border-none", item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/20 text-white hover:bg-white/30")} 
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id, !!item.isFavorite); }}
          >
            <Heart className={cn("w-5 h-5", item.isFavorite ? "fill-current" : "")} />
          </Button>
          {canDownload && (
            <Button size="icon" className="rounded-full h-12 w-12 bg-white text-black hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); onDownload(item); }}>
              <Download className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
GalleryItem.displayName = 'GalleryItem';

export default function ClientGalleryPage() {
  const params = useParams();
  const galleryParam = (params?.id as string) || "";
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState<string>('');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  const viewIncremented = useRef<string | null>(null);

  useEffect(() => {
    async function resolveGallery() {
      if (!firestore || !galleryParam) {
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      const cleanParam = galleryParam.trim();
      const slugAttempt = cleanParam.toLowerCase();

      try {
        const q = query(
          collection(firestore, 'galleries'), 
          where('slug', '==', slugAttempt),
          where('isPublic', '==', true)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundId = querySnapshot.docs[0].id;
          const galleryData = querySnapshot.docs[0].data();
          setGalleryId(foundId);
          
          if (viewIncremented.current !== foundId && user?.uid !== galleryData.userId) {
            viewIncremented.current = foundId;
            const gRef = doc(firestore, 'galleries', foundId);
            updateDoc(gRef, { viewCount: increment(1) }).catch(() => {});
          }
        } else {
          if (cleanParam.length > 15) {
            setGalleryId(cleanParam);
          } else {
            setGalleryId(null);
          }
        }
      } catch (err: any) {
        if (cleanParam.length > 15) {
          setGalleryId(cleanParam);
        } else {
          setGalleryId(null);
        }
      } finally {
        setIsResolving(false);
      }
    }
    resolveGallery();
  }, [firestore, galleryParam, user]);

  const galleryRef = useMemo(() => {
    if (!firestore || !galleryId) return null;
    return doc(firestore, 'galleries', galleryId);
  }, [firestore, galleryId]);

  const { data: gallery, loading: docLoading, error: galleryError } = useDoc(galleryRef);

  const photographerRef = useMemo(() => {
    if (!firestore || !gallery?.userId || !user || user.uid !== gallery.userId) return null;
    return doc(firestore, 'users', gallery.userId);
  }, [firestore, gallery?.userId, user?.uid]);

  const { data: profile } = useDoc(photographerRef);

  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;

  const photographerPlan = useMemo(() => {
    const rawPlanId = profile?.planId || 'starter';
    const planId = (typeof rawPlanId === 'string' ? rawPlanId.toLowerCase() : 'starter') as PlanId;
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const canDownload = useMemo(() => {
    return gallery ? (gallery.isLocked === false && gallery.isPaid === true) : false;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const showWatermark = useMemo(() => {
    return gallery ? (gallery.isLocked === true || gallery.isPaid === false) : true;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const handleFavorite = useCallback((itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    const gRef = doc(firestore, 'galleries', galleryId);
    const updatedItems = (gallery.items || []).map((item: any) => 
      item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
    );
    const updateData = { items: updatedItems };

    updateDoc(gRef, updateData)
      .then(() => {
        toast({ title: isCurrentlyFavorite ? "Removed" : "Favorited" });
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: gRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      });
  }, [firestore, gallery, galleryId, toast]);

  const handleDownloadSingle = useCallback(async (item: any) => {
    if (!canDownload) return;
    try {
      const url = item.masterUrl || item.url;
      const res = await fetch(url);
      const blob = await res.blob();
      saveAs(blob, item.fileName || `photo-${item.id}.jpg`);
    } catch (error) {
      toast({ variant: "destructive", title: "Download Failed" });
    }
  }, [canDownload, toast]);

  const handleDownloadAll = async () => {
    if (isPreparing || !gallery || !canDownload) return;
    
    const items = gallery.items || [];
    if (items.length === 0) {
      toast({ title: "No items to download" });
      return;
    }

    const estimatedSizeGb = estimateZipSizeGb(items.length);
    if (estimatedSizeGb > photographerPlan.zipLimitGb) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setIsPreparing(true);
    const zip = new JSZip();
    const totalItems = items.length;
    let successfulCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < totalItems; i++) {
        const item = items[i];
        setPreparationStep(`Fetching Masterpieces: ${i + 1} / ${totalItems}`);
        
        try {
          const url = item.masterUrl || item.url;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const blob = await res.blob();
          
          const filename = item.fileName || `photo-${i + 1}.jpg`;
          zip.file(filename, blob);
          successfulCount++;
        } catch (itemError) {
          console.error(`Failed to download ${item.id}:`, itemError);
          failedCount++;
        }
      }
      
      if (successfulCount === 0) {
        throw new Error("All image downloads failed.");
      }

      setPreparationStep('Compiling Secure Package...');
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "STORE",
      });
      
      const zipName = `${gallery.title || 'gallery'}.zip`.replace(/[^a-z0-9.]/gi, '_');
      saveAs(content, zipName);
      
      toast({ 
        title: "Download Started", 
        description: failedCount > 0 
          ? `Package ready. ${successfulCount} items included, ${failedCount} failed.` 
          : "Your secure gallery package is ready." 
      });
    } catch (error: any) {
      console.error("ZIP Generation Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Package Error", 
        description: error.message || "Failed to generate ZIP package." 
      });
    } finally {
      setIsPreparing(false);
      setPreparationStep('');
    }
  };

  if (isResolving || docLoading || (galleryId && !gallery && !galleryError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/50">Resolving Luxury Gallery...</p>
      </div>
    );
  }

  if (galleryError || !gallery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-8">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">Gallery Unavailable</h1>
        <p className="text-muted-foreground mb-8 max-sm">
          The requested gallery could not be found or is currently restricted by the studio.
        </p>
        <Link href="/"><Button className="rounded-full px-10 bg-primary h-12 font-bold">Return Home</Button></Link>
      </div>
    );
  }

  const coverImageUrl = gallery.coverImage || (gallery.items && gallery.items.length > 0 ? gallery.items[0].url : 'https://picsum.photos/seed/hafash-empty/1920/1080');

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      {/* Floating Back Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-8 left-8 z-[60] h-12 w-12 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/10"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      <div className="h-[85vh] relative overflow-hidden flex flex-col items-center justify-center bg-card">
        <Image 
          src={coverImageUrl} 
          fill 
          className="absolute inset-0 w-full h-full object-cover opacity-80" 
          alt="Gallery Cover" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        
        <div className="absolute top-12 left-0 right-0 flex flex-col items-center">
          {studioLogo && (
            <Image 
              src={studioLogo} 
              width={200} 
              height={80} 
              className="h-16 md:h-20 w-auto mb-4 object-contain" 
              alt="Studio Logo" 
            />
          )}
          <span className="text-sm font-bold tracking-[0.5em] text-primary uppercase">
            {studioName}
          </span>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <span className="text-4xl md:text-9xl font-headline font-bold text-white italic">Hafash.pk</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-headline font-bold mb-6 text-white uppercase tracking-tight">{gallery.title}</h1>
          
          {gallery.description && (
            <div className="max-w-md mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl group hover:border-primary/20 transition-all">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-1">
                       <h3 className="font-headline font-bold text-xl text-white">Message from Photographer</h3>
                       <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">A personal message has been left for you</p>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="rounded-full px-10 h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-xl shadow-primary/10 mt-2">
                          Read Message
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-card border-border/50 rounded-[2.5rem] p-10 md:p-14 shadow-2xl overflow-hidden ring-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-100 [transform:translateZ(0)]">
                        <DialogHeader>
                          <div className="flex flex-col items-center text-center gap-4 mb-8">
                             <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                               <Mail className="w-8 h-8" />
                             </div>
                             <div className="space-y-1">
                               <DialogTitle className="text-3xl font-headline font-bold">A Personal Note</DialogTitle>
                               <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Direct from the studio</p>
                             </div>
                          </div>
                        </DialogHeader>
                        
                        <div className="max-h-[45vh] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                           <div className="relative text-center">
                             <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words italic text-xl px-2">
                               {gallery.description}
                             </p>
                           </div>
                        </div>

                        <div className="mt-10 flex justify-center">
                          <DialogClose asChild>
                            <Button variant="outline" className="rounded-full px-10 h-12 border-border/50 hover:bg-primary/5 hover:text-primary transition-all font-bold">
                              Close Message
                            </Button>
                          </DialogClose>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
               </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xl italic text-primary font-headline">{gallery.clientName}</p>
            <div className="flex items-center justify-center gap-4 text-white uppercase tracking-[0.3em] text-[10px] font-bold">
              <span>{gallery.category}</span>
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-14 flex flex-wrap justify-center items-center gap-4">
            {whatsappNumber && (
              <Button className="rounded-full px-10 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-2xl" onClick={() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`, '_blank')}>
                <MessageCircle className="w-5 h-5" /> Contact Studio
              </Button>
            )}

            {canDownload && gallery.items?.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <Button 
                  className={cn("rounded-full px-10 h-14 bg-primary/20 border border-primary/30 text-white hover:bg-primary/30 font-bold gap-3 shadow-2xl backdrop-blur-md", isPreparing && "opacity-70 cursor-wait")}
                  onClick={handleDownloadAll}
                  disabled={isPreparing}
                >
                  {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isPreparing ? "Preparing..." : "Download All"}
                </Button>
                {isPreparing && (
                  <div className="flex items-center gap-2 text-[9px] uppercase font-bold text-primary animate-pulse">
                    <Clock className="w-3 h-3" /> {preparationStep}
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" className="rounded-full px-10 h-14 border-white/40 text-white hover:bg-white/10 gap-3 backdrop-blur-md" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied" }); }}>
              <Share2 className="w-5 h-5" /> Share Gallery
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex justify-between items-center mb-12 border-b border-border/20 pb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold uppercase tracking-widest">Masterpieces</h2>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Client Selection Enabled</p>
            </div>
          </div>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {gallery.items?.map((item: any) => (
            <GalleryItem 
              key={item.id}
              item={item}
              showWatermark={showWatermark}
              canDownload={canDownload}
              onFavorite={handleFavorite}
              onDownload={handleDownloadSingle}
              onSelect={setSelectedImage}
            />
          ))}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative">
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" alt="Fullscreen" />
            {showWatermark && <div className="watermark-text">HAFASH PREVIEW</div>}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-white h-12 w-12 hover:bg-white/10 rounded-full">
            <X className="w-8 h-8" />
          </Button>
        </div>
      )}

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline">Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your studio's current plan allows ZIP packages up to {photographerPlan.zipLimitGb} GB. This gallery exceeds that limit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-primary" onClick={() => router.push('/storage')}>Upgrade Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
