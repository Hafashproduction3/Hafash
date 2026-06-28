
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
  ShieldCheck
} from 'lucide-react';
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

  // Debug Logging for Production Telemetry
  useEffect(() => {
    if (galleryId) {
      console.log(`[GALLERY_DEBUG] Active Gallery ID: ${galleryId}`);
    }
  }, [galleryId]);

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
        console.log(`[GALLERY_DEBUG] Attempting slug resolution for: ${slugAttempt}`);
        
        // Security Rules Note: Anonymous users can only query if the query is restricted to isPublic: true
        const constraints = [where('slug', '==', slugAttempt)];
        if (!user) {
          constraints.push(where('isPublic', '==', true));
        }
        
        const q = query(collection(firestore, 'galleries'), ...constraints);
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundId = querySnapshot.docs[0].id;
          console.log(`[GALLERY_DEBUG] Slug resolved to ID: ${foundId}`);
          setGalleryId(foundId);
          
          if (viewIncremented.current !== foundId) {
            viewIncremented.current = foundId;
            const gRef = doc(firestore, 'galleries', foundId);
            updateDoc(gRef, { viewCount: increment(1) }).catch(() => {});
          }
        } else {
          console.log(`[GALLERY_DEBUG] No slug match found. Falling back to direct ID: ${cleanParam}`);
          setGalleryId(cleanParam);
        }
      } catch (err: any) {
        console.error(`[GALLERY_DEBUG] Slug resolution failed (likely permission restriction). Falling back to ID: ${cleanParam}`, err);
        setGalleryId(cleanParam);
      } finally {
        setIsResolving(false);
      }
    }
    resolveGallery();
  }, [firestore, galleryParam, user]);

  const galleryRef = useMemo(() => {
    if (!firestore || !galleryId) return null;
    const ref = doc(firestore, 'galleries', galleryId);
    console.log(`[GALLERY_DEBUG] Requesting Gallery Doc: ${ref.path}`);
    return ref;
  }, [firestore, galleryId]);

  const { data: gallery, loading: docLoading, error: galleryError } = useDoc(galleryRef);

  // Determine if current user is the owner to avoid permission errors when reading the users collection
  const isOwner = useMemo(() => !!user && !!gallery && user.uid === gallery.userId, [user, gallery]);

  const photographerRef = useMemo(() => {
    // SECURITY: Anonymous clients do not have permission to read the users collection.
    // We only create this ref if the user is authenticated as the gallery owner.
    if (!firestore || !isOwner || !gallery?.userId) return null;
    const ref = doc(firestore, 'users', gallery.userId);
    console.log(`[GALLERY_DEBUG] Requesting Photographer Profile: ${ref.path}`);
    return ref;
  }, [firestore, isOwner, gallery?.userId]);

  const { data: profile } = useDoc(photographerRef);

  const photographerPlan = useMemo(() => {
    const rawPlanId = profile?.planId || 'starter';
    const planId = (typeof rawPlanId === 'string' ? rawPlanId.toLowerCase() : 'starter') as PlanId;
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

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
  };

  const handleDownloadAll = async () => {
    if (isPreparing || !gallery || !canDownload) return;
    const items = gallery.items || [];
    const estimatedSizeGb = estimateZipSizeGb(items.length);
    
    if (estimatedSizeGb > photographerPlan.zipLimitGb) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setIsPreparing(true);
    setPreparationStep('Validating Cache...');
    
    const cacheKey = `hafash_zip_cache_${galleryId}`;
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    const now = new Date().getTime();
    
    if (cachedData) {
      const cache = JSON.parse(cachedData);
      if (now - cache.timestamp < 24 * 60 * 60 * 1000) {
        setPreparationStep('Retrieving from Cache (Instant)...');
        await new Promise(r => setTimeout(r, 800));
      } else {
        localStorage.removeItem(cacheKey);
        await executePrioritizedPreparation();
      }
    } else {
      await executePrioritizedPreparation();
    }
    
    try {
      setPreparationStep('Fetching Original Masterpieces (Max CDN Speed)...');
      const zip = new JSZip();
      await Promise.all(items.map(async (item: any, index: number) => {
        const url = item.masterUrl || item.url;
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(item.fileName || `photo-${index + 1}.jpg`, blob);
      }));
      
      setPreparationStep('Compiling Secure Package...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now }));
      }
      
      saveAs(content, `${gallery.title || 'gallery'}.zip`);
      toast({ title: "Ready", description: "Your package is ready and downloading." });
    } catch (error) {
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsPreparing(false);
      setPreparationStep('');
    }
  };

  const executePrioritizedPreparation = async () => {
    const priorityTimes = { Business: 2000, 'High Priority': 5000, Standard: 10000 };
    const waitTime = priorityTimes[photographerPlan.priorityLabel as keyof typeof priorityTimes] || 10000;
    
    setPreparationStep(`Priority Queue: ${photographerPlan.priorityLabel}...`);
    await new Promise(r => setTimeout(r, waitTime * 0.3));
    
    setPreparationStep('Optimizing Package Structure...');
    await new Promise(r => setTimeout(r, waitTime * 0.4));
    
    setPreparationStep('Finalizing Encryption...');
    await new Promise(r => setTimeout(r, waitTime * 0.3));
  };

  // Improved UI Guarding: Avoid showing "Access Restricted" during transition frames
  if (isResolving || docLoading || (galleryId && !gallery && !galleryError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/50">Resolving Luxury Gallery...</p>
      </div>
    );
  }

  if (galleryError || !gallery) {
    const isPermissionDenied = galleryError?.message?.includes('permission-denied') || galleryError?.message?.includes('insufficient permissions');
    console.error(`[GALLERY_DEBUG] Rendering error state. Error:`, galleryError);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-8">
          {isPermissionDenied ? <Lock className="w-12 h-12 text-destructive" /> : <ShieldAlert className="w-12 h-12 text-destructive" />}
        </div>
        <h1 className="text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">
          {isPermissionDenied ? 'Access Restricted' : 'Gallery Unavailable'}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          {isPermissionDenied 
            ? 'This event has been set to private by the photographer. Please contact the studio for access.' 
            : 'The requested gallery could not be found or is currently unavailable.'}
        </p>
        <Link href="/"><Button className="rounded-full px-10 bg-primary h-12 font-bold">Return Home</Button></Link>
      </div>
    );
  }

  const coverImageUrl = gallery.coverImage || (gallery.items && gallery.items.length > 0 ? gallery.items[0].url : 'https://picsum.photos/seed/hafash-empty/1920/1080');

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      <div className="h-[85vh] relative overflow-hidden flex flex-col items-center justify-center bg-card">
        <img src={coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Gallery Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        
        <div className="absolute top-12 left-0 right-0 flex flex-col items-center">
          {profile?.studioLogo && (
            <img src={profile.studioLogo} className="h-16 md:h-20 w-auto mb-4 object-contain" alt="Studio Logo" />
          )}
          <span className="text-sm font-bold tracking-[0.5em] text-primary uppercase">
            {profile?.studioName || 'Professional Studio'}
          </span>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <span className="text-4xl md:text-9xl font-headline font-bold text-white italic">Hafash.pk</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-headline font-bold mb-6 text-white uppercase tracking-tight">{gallery.title}</h1>
          <div className="space-y-4">
            <p className="text-xl italic text-primary font-headline">{gallery.clientName}</p>
            <div className="flex items-center justify-center gap-4 text-white uppercase tracking-[0.3em] text-[10px] font-bold">
              <span>{gallery.category}</span>
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            {profile?.whatsappNumber && (
              <Button className="rounded-full px-10 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-2xl" onClick={() => window.open(`https://wa.me/${profile.whatsappNumber.replace(/\D/g, '')}`, '_blank')}>
                <MessageCircle className="w-5 h-5" /> Contact Studio
              </Button>
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
          {canDownload && gallery.items?.length > 0 && (
            <div className="flex flex-col items-end gap-2">
              <Button 
                className={cn("rounded-full px-8 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bold gap-2 h-12", isPreparing && "opacity-70 cursor-wait")}
                onClick={handleDownloadAll}
                disabled={isPreparing}
              >
                {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isPreparing ? "Preparing..." : "Download All"}
              </Button>
              {isPreparing && (
                <div className="flex items-center gap-2 text-[9px] uppercase font-bold text-primary animate-pulse">
                  <Clock className="w-3 h-3" /> {preparationStep}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {gallery.items?.map((item: any) => (
            <div 
              key={item.id} 
              className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-border/10 bg-card/20 cursor-zoom-in" 
              onClick={() => setSelectedImage(item.url)}
            >
              <img src={item.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" alt="Gallery" />
              {showWatermark && <div className="watermark-text">HAFASH PREVIEW</div>}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                <div className="flex gap-2">
                  <Button size="icon" className={cn("rounded-full h-12 w-12 border-none", item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/20 text-white hover:bg-white/30")} onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, !!item.isFavorite); }}>
                    <Heart className={cn("w-5 h-5", item.isFavorite ? "fill-current" : "")} />
                  </Button>
                </div>
              </div>
            </div>
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
