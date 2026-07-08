"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Download, 
  Loader2, 
  X, 
  MessageCircle, 
  Share2, 
  ShieldAlert,
  ArrowLeft,
  Lock,
  EyeOff,
  Eye,
  Key,
  ShieldCheck,
  Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HAFASH_PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/plans';

// Memoized Gallery Item for performance
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
      className="relative group break-inside-avoid overflow-hidden rounded-[2.5rem] border border-border/10 bg-card/20 cursor-zoom-in mb-8" 
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
  
  // 1. Core State
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState<string>('');

  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showGatePass, setShowGatePass] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // 2. Resolution Logic
  useEffect(() => {
    async function resolveGallery() {
      if (!firestore || !galleryParam) {
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      const cleanParam = galleryParam.trim();
      let resolvedId = cleanParam.length >= 18 ? cleanParam : null;

      try {
        // First try to resolve as a slug
        const qSlug = query(
          collection(firestore, 'galleries'), 
          where('slug', '==', cleanParam.toLowerCase())
        );
        const snapSlug = await getDocs(qSlug);
        
        if (!snapSlug.empty) {
          resolvedId = snapSlug.docs[0].id;
        } else if (!resolvedId) {
          // If no slug found and param doesn't look like an ID, we're done
          resolvedId = null;
        }
      } catch (err) {
        console.warn("Resolution error (possible permission restrictions):", err);
      }

      setGalleryId(resolvedId);
      setIsResolving(false);
    }
    resolveGallery();
  }, [firestore, galleryParam]);

  // 3. Document Hooks
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

  // 4. Session Recovery
  useEffect(() => {
    if (galleryId) {
      const stored = sessionStorage.getItem(`hafash_unlocked_${galleryId}`);
      if (stored === 'true') setIsUnlocked(true);
    }
  }, [galleryId]);

  // 5. Derivative Values
  const photographerPlan = useMemo(() => {
    if (!profile) return DEFAULT_PLAN;
    const rawPlanId = profile.planId || 'starter';
    const planId = (typeof rawPlanId === 'string' ? rawPlanId.toLowerCase() : 'starter') as PlanId;
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile]);

  const isCustomBrandingActive = useMemo(() => {
    return photographerPlan.id !== 'starter';
  }, [photographerPlan.id]);

  const effectiveHeroImage = useMemo(() => {
    if (!gallery && !profile) return 'https://picsum.photos/seed/hafash-empty/1920/1080';
    if (isCustomBrandingActive && profile?.studioBanner) return profile.studioBanner;
    return gallery?.coverImage || 'https://picsum.photos/seed/hafash-empty/1920/1080';
  }, [isCustomBrandingActive, profile, gallery]);

  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;

  const canDownload = useMemo(() => {
    return gallery ? (gallery.isLocked === false && gallery.isPaid === true) : false;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const showWatermark = useMemo(() => {
    return gallery ? (gallery.isLocked === true || gallery.isPaid === false) : true;
  }, [gallery?.isLocked, gallery?.isPaid]);

  // Strict Owner Logic: Must have both IDs defined
  const isOwner = useMemo(() => {
    return !!(user?.uid && gallery?.userId && user.uid === gallery.userId);
  }, [user?.uid, gallery?.userId]);

  // Gate Logic: strictly boolean enforcement
  const showGate = useMemo(() => {
    if (isOwner) return false;
    return !!(gallery?.isPasswordProtected && !isUnlocked);
  }, [gallery?.isPasswordProtected, isUnlocked, isOwner]);

  // 6. Action Handlers
  const handleFavorite = useCallback((itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    const gRef = doc(firestore, 'galleries', galleryId);
    const updatedItems = (gallery.items || []).map((item: any) => 
      item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
    );
    updateDoc(gRef, { items: updatedItems }).catch(() => {});
  }, [firestore, gallery, galleryId]);

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
    setIsPreparing(true);
    const zip = new JSZip();
    const items = gallery.items || [];
    
    try {
      for (let i = 0; i < items.length; i++) {
        setPreparationStep(`Fetching Masterpieces: ${i + 1} / ${items.length}`);
        const url = items[i].masterUrl || items[i].url;
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(items[i].fileName || `photo-${i + 1}.jpg`, blob);
      }
      setPreparationStep('Compiling Secure Package...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${gallery.title || 'gallery'}.zip`);
    } catch (error) {
      toast({ variant: "destructive", title: "Package Error" });
    } finally {
      setIsPreparing(false);
      setPreparationStep('');
    }
  };

  const verifyPassword = async () => {
    if (!gallery?.hashedPassword) return;
    setVerifying(true);
    setPasswordError(false);

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashed === gallery.hashedPassword) {
        setIsUnlocked(true);
        sessionStorage.setItem(`hafash_unlocked_${galleryId}`, 'true');
        toast({ title: "Access Granted", description: "Welcome to the luxury workspace." });
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Security Error" });
    } finally {
      setVerifying(false);
    }
  };

  // 7. Render Logic
  const isLoading = isResolving || (!!galleryId && docLoading);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/50">Resolving Luxury Gallery...</p>
      </div>
    );
  }

  if (!isLoading && (galleryError || !gallery || (!gallery.isPublic && !isOwner))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-8">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">Gallery Unavailable</h1>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          The requested gallery could not be found or is currently restricted by the studio.
        </p>
        <Link href="/"><Button className="rounded-full px-10 bg-primary h-12 font-bold">Return Home</Button></Link>
      </div>
    );
  }

  // Password Gate UI
  if (showGate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 selection:bg-primary selection:text-primary-foreground">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
           <div className="text-center space-y-4">
              <div className="flex flex-col items-center mb-8">
                {isCustomBrandingActive && studioLogo ? (
                   <img src={studioLogo} className="h-16 w-auto mb-4 object-contain" alt="Studio Logo" />
                ) : (
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <img src="/hafash-logo.png" className="h-[40px] w-auto" alt="Logo" />
                    <span className="text-3xl font-headline font-bold text-white italic">Hafash.pk</span>
                  </div>
                )}
                <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[9px] px-3 py-1">
                  SECURE ACCESS PORTAL
                </Badge>
              </div>
              <h1 className="text-3xl font-headline font-bold text-white uppercase tracking-tight">{gallery.title}</h1>
              <p className="text-muted-foreground text-sm italic font-headline">{gallery.clientName}</p>
           </div>

           <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardContent className="p-10 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Encrypted Gallery Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
                    <Input 
                      type={showGatePass ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                      placeholder="Enter access code"
                      className="pl-10 pr-10 h-12 bg-background/50 border-border/50 rounded-xl"
                    />
                    <button 
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setShowGatePass(!showGatePass)}
                    >
                      {showGatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-[10px] text-destructive font-bold uppercase tracking-widest text-center mt-2">
                      Incorrect password. Please try again.
                    </p>
                  )}
                </div>

                <Button 
                  className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 transition-all"
                  onClick={verifyPassword}
                  disabled={verifying || !passwordInput}
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5 mr-2" />}
                  Unlock Gallery
                </Button>
              </CardContent>
           </Card>

           <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                End-to-End Asset Protection Guaranteed by Hafash
              </p>
           </div>
        </div>
      </div>
    );
  }

  // 8. Main Gallery Render
  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      <Button 
        variant="ghost" size="icon" 
        className="fixed top-4 left-4 lg:top-8 lg:left-8 z-[60] h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/10"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
      </Button>

      <div className={cn(
        "h-[80vh] lg:h-[85vh] relative overflow-hidden flex flex-col items-center justify-center bg-card shadow-2xl transition-all",
        isCustomBrandingActive && profile?.studioBanner && "rounded-b-[2.5rem] lg:rounded-b-[4rem]"
      )}>
        <Image src={effectiveHeroImage} fill className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="flex flex-col items-center mb-6">
            {isCustomBrandingActive ? (
              <div className="flex flex-col items-center mb-8">
                {studioLogo ? (
                  <img src={studioLogo} className="h-16 lg:h-20 w-auto mb-6 object-contain" alt="Logo" />
                ) : (
                  <span className="text-3xl lg:text-5xl font-headline font-bold text-white uppercase tracking-tighter mb-4">{studioName}</span>
                )}
                {profile?.photographerName && (
                  <p className="text-primary italic font-headline tracking-widest text-[10px] lg:text-xs uppercase">{profile.photographerName}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <img src="/hafash-logo.png" className="h-[40px] w-auto" alt="Logo" />
                  <span className="text-3xl sm:text-5xl lg:text-9xl font-headline font-bold text-white italic">Hafash.pk</span>
                </div>
                <span className="text-[9px] lg:text-[10px] font-bold tracking-[0.5em] text-primary/70 uppercase">LUXURY GALLERY DELIVERY</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-headline font-bold mb-6 text-white uppercase tracking-tight leading-tight">{gallery.title}</h1>
          
          <div className="space-y-4">
            <p className="text-lg lg:text-xl italic text-primary font-headline">{gallery.clientName}</p>
            <div className="flex items-center justify-center gap-4 text-white uppercase tracking-[0.3em] text-[9px] lg:text-[10px] font-bold">
              <span>{gallery.category}</span>
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-10 lg:mt-14 flex flex-wrap justify-center items-center gap-3 lg:gap-4">
            {whatsappNumber && (
              <Button className="flex-1 sm:flex-none rounded-full px-8 lg:px-10 h-12 lg:h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-2xl text-xs lg:text-sm" onClick={() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`, '_blank')}>
                <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" /> Contact Studio
              </Button>
            )}

            {canDownload && gallery.items?.length > 0 && (
              <div className="flex flex-col items-center gap-2 flex-1 sm:flex-none">
                <Button 
                  className={cn("w-full sm:w-auto rounded-full px-8 lg:px-10 h-12 lg:h-14 bg-primary/20 border border-primary/30 text-white hover:bg-primary/30 font-bold gap-3 shadow-2xl backdrop-blur-md text-xs lg:text-sm", isPreparing && "opacity-70 cursor-wait")}
                  onClick={handleDownloadAll}
                  disabled={isPreparing}
                >
                  {isPreparing ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Download className="w-4 h-4 lg:w-5 lg:h-5" />}
                  {isPreparing ? "Preparing..." : "Download All"}
                </Button>
              </div>
            )}

            <Button variant="outline" className="flex-1 sm:flex-none rounded-full px-8 lg:px-10 h-12 lg:h-14 border-white/40 text-white hover:bg-white/10 gap-3 backdrop-blur-md text-xs lg:text-sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied" }); }}>
              <Share2 className="w-4 h-4 lg:w-5 lg:h-5" /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 lg:gap-8 space-y-6 lg:space-y-8">
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

      <footer className="mt-20 pt-16 border-t border-border/20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500">
              <img src="/hafash-logo.png" alt="Hafash" className="h-6 w-auto grayscale" />
              <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-muted-foreground">Powered by Hafash.pk</span>
            </div>
          </div>
        </div>
      </footer>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-4 lg:p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" alt="Fullscreen" />
            {showWatermark && <div className="watermark-text">HAFASH PREVIEW</div>}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 lg:top-8 lg:right-8 text-white h-10 w-10 lg:h-12 lg:w-12 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 lg:w-8 lg:h-8" />
          </Button>
        </div>
      )}
    </div>
  );
}
