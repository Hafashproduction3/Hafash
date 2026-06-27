"use client";

import { useFirestore, useDoc } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Download, 
  Camera, 
  ShieldAlert, 
  Loader2, 
  X, 
  Lock, 
  MessageCircle, 
  Share2, 
  ImageIcon, 
  Sparkles, 
  AlertTriangle, 
  Activity, 
  CheckCircle2,
  ShieldCheck,
  ChevronRight
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
  const galleryParam = params?.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipMessage, setZipMessage] = useState("");
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
        const q = query(collection(firestore, 'galleries'), where('slug', '==', slugAttempt));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundId = querySnapshot.docs[0].id;
          setGalleryId(foundId);
          
          if (viewIncremented.current !== foundId) {
            viewIncremented.current = foundId;
            const gRef = doc(firestore, 'galleries', foundId);
            updateDoc(gRef, { viewCount: increment(1) }).catch(() => {});
          }
        } else {
          setGalleryId(cleanParam);
        }
      } catch (err: any) {
        setGalleryId(cleanParam);
      } finally {
        setIsResolving(false);
      }
    }
    resolveGallery();
  }, [firestore, galleryParam]);

  const galleryRef = useMemo(() => {
    if (!firestore || !galleryId) return null;
    return doc(firestore, 'galleries', galleryId);
  }, [firestore, galleryId]);

  const { data: gallery, loading: docLoading, error: galleryError } = useDoc(galleryRef);

  const photographerRef = useMemo(() => {
    if (!firestore || !gallery?.userId) return null;
    return doc(firestore, 'users', gallery.userId);
  }, [firestore, gallery?.userId]);

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
        toast({ 
          title: isCurrentlyFavorite ? "Removed" : "Favorited", 
          description: "Syncing selection with studio." 
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
        }
      });
  };

  const handleDownloadAttempt = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!canDownload) return;
    
    const downloadUrl = item.masterUrl || item.url;
    const filename = item.fileName || `${gallery?.title || 'hafash'}-${item.id}.jpg`;

    try {
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
    const items = gallery.items || [];
    const estimatedSizeGb = estimateZipSizeGb(items.length);
    if (estimatedSizeGb > photographerPlan.zipLimitGb) {
      setShowUpgradeDialog(true);
      return;
    }
    
    setIsZipping(true);
    setZipMessage("Preparing your masterpieces...");

    try {
      const zip = new JSZip();
      const downloadPromises = items.map(async (item: any, index: number) => {
        const originalUrl = item.masterUrl || item.url;
        const response = await fetch(originalUrl);
        const blob = await response.blob();
        const extension = item.fileName?.split('.').pop() || 'jpg';
        const fileName = item.fileName || `${gallery.title}-${index + 1}.${extension}`;
        zip.file(fileName, blob);
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${gallery.title.replace(/\s+/g, '_')}_all_photos.zip`);
      toast({ title: "Success", description: "All photos downloaded." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsZipping(false);
      setZipMessage("");
    }
  };

  const handleWhatsAppContact = () => {
    if (!profile?.whatsappNumber) return;
    const cleanedNumber = profile.whatsappNumber.replace(/\D/g, '');
    const message = `Hi, I'm viewing the "${gallery?.title}" gallery and would like to contact you.`;
    window.open(`https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied" });
  };

  if (isResolving || docLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (galleryError || !gallery) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <Lock className="w-12 h-12 text-destructive/30 mb-6" />
      <h1 className="text-3xl font-headline font-bold mb-4 uppercase">Gallery Unavailable</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">This gallery is protected or does not exist.</p>
      <Link href="/"><Button className="rounded-full px-10 bg-primary">Return Home</Button></Link>
    </div>
  );

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
          <h1 className="text-3xl md:text-6xl font-headline font-bold mb-6 text-white uppercase">{gallery.title}</h1>
          <div className="space-y-4">
            <p className="text-xl italic text-primary font-headline">{gallery.clientName}</p>
            <div className="flex items-center justify-center gap-4 text-white uppercase tracking-[0.3em] text-[10px] font-bold">
              <span>{gallery.category}</span>
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            {profile?.whatsappNumber && (
              <Button className="rounded-full px-10 h-14 bg-primary font-bold gap-3 shadow-2xl" onClick={handleWhatsAppContact}>
                <MessageCircle className="w-5 h-5" /> Contact Studio
              </Button>
            )}
            <Button variant="outline" className="rounded-full px-10 h-14 border-white/40 text-white hover:bg-white/10 gap-3 backdrop-blur-md" onClick={handleShare}>
              <Share2 className="w-5 h-5" /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-2xl font-headline font-bold uppercase tracking-widest">Masterpieces</h2>
          {canDownload && gallery.items?.length > 0 && (
            <Button 
              className={cn("rounded-full px-8 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bold gap-2", isZipping && "opacity-70 cursor-wait")}
              onClick={handleDownloadAll}
              disabled={isZipping}
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isZipping ? "Processing..." : "Download All"}
            </Button>
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
                  <Button size="icon" className={cn("rounded-full h-12 w-12", item.isFavorite ? "bg-primary" : "bg-white/20")} onClick={(e) => { e.stopPropagation(); handleFavorite(item.id, !!item.isFavorite); }}>
                    <Heart className={cn("w-5 h-5", item.isFavorite ? "fill-current" : "")} />
                  </Button>
                  {canDownload && (
                    <Button size="icon" className="rounded-full h-12 w-12 bg-white/20" onClick={(e) => handleDownloadAttempt(e, item)}>
                      <Download className="w-5 h-5" />
                    </Button>
                  )}
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
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-white h-12 w-12">
            <X className="w-8 h-8" />
          </Button>
        </div>
      )}

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline">Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your studio's current plan allows ZIP packages up to {photographerPlan.zipLimitGb} GB. This gallery exceeds that limit. Upgrade your storage plan to generate larger ZIP packages.
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
