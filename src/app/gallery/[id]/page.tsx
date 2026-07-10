"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Heart, 
  Download, 
  Loader2, 
  X, 
  MessageCircle, 
  Share2, 
  ShieldAlert,
  ArrowLeft,
  Key,
  ShieldCheck,
  EyeOff,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, limit } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { type PlanId } from '@/lib/plans';

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
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState<string>('');

  // Password Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showGatePass, setShowGatePass] = useState(false);

  // Secure Multi-Stage Resolution Logic
  useEffect(() => {
    async function resolve() {
      if (!firestore || !galleryParam) {
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      setGalleryId(null);
      const cleanParam = galleryParam.trim();
      let resolvedId = null;

      try {
        // Stage 1: Public Slug Resolution
        const publicSlugQuery = query(
          collection(firestore, 'galleries'),
          where('slug', '==', cleanParam.toLowerCase()),
          where('isPublic', '==', true),
          limit(1)
        );
        const publicSnap = await getDocs(publicSlugQuery);
        
        if (!publicSnap.empty) {
          resolvedId = publicSnap.docs[0].id;
        } 
        // Stage 2: Owner Slug Resolution
        else if (user) {
          const ownerSlugQuery = query(
            collection(firestore, 'galleries'),
            where('slug', '==', cleanParam.toLowerCase()),
            where('userId', '==', user.uid),
            limit(1)
          );
          const ownerSnap = await getDocs(ownerSlugQuery);
          if (!ownerSnap.empty) {
            resolvedId = ownerSnap.docs[0].id;
          }
        }

        // Stage 3: Direct ID Fallback (Strict Format Check)
        if (!resolvedId && /^[a-zA-Z0-9]{20}$/.test(cleanParam)) {
          resolvedId = cleanParam;
        }

        setGalleryId(resolvedId);
      } catch (err: any) {
        console.error("Gallery resolution error:", err);
      } finally {
        setIsResolving(false);
      }
    }
    resolve();
  }, [firestore, galleryParam, user?.uid]);

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

  // Strict Owner Verification
  const isOwner = useMemo(() => {
    if (!user?.uid || !gallery?.userId) return false;
    return user.uid === gallery.userId;
  }, [user?.uid, gallery?.userId]);

  // Master visibility switch
  const isAvailable = useMemo(() => {
    if (isResolving || docLoading || !gallery) return false; 
    return isOwner || gallery.isPublic === true;
  }, [gallery, isOwner, isResolving, docLoading]);

  // Password Gate Logic
  const requiresPassword = useMemo(() => {
    return Boolean(gallery?.isPasswordProtected) && !isOwner;
  }, [gallery?.isPasswordProtected, isOwner]);

  // Auto-unlock from session
  useEffect(() => {
    if (galleryId && typeof window !== 'undefined') {
      const unlocked = localStorage.getItem(`hafash_unlock_${galleryId}`);
      if (unlocked === 'true') setIsUnlocked(true);
    }
  }, [galleryId]);

  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyPassword = async () => {
    if (!passwordInput || !gallery?.hashedPassword) return;
    setVerifying(true);
    setPasswordError(false);
    try {
      const hashed = await hashPassword(passwordInput);
      if (hashed === gallery.hashedPassword) {
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`hafash_unlock_${galleryId}`, 'true');
        }
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleFavorite = useCallback((itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    const gRef = doc(firestore, 'galleries', galleryId);
    const updatedItems = (gallery.items || []).map((item: any) => 
      item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
    );
    updateDoc(gRef, { items: updatedItems }).catch(() => {});
  }, [firestore, gallery, galleryId]);

  const handleDownloadSingle = useCallback(async (item: any) => {
    const canDownload = gallery ? (!gallery.isLocked && !!gallery.isPaid) : false;
    if (!canDownload) return;
    try {
      const url = item.masterUrl || item.url;
      const res = await fetch(url);
      const blob = await res.blob();
      saveAs(blob, item.fileName || `photo-${item.id}.jpg`);
    } catch (error) {
      toast({ variant: "destructive", title: "Download Failed" });
    }
  }, [gallery, toast]);

  const handleDownloadAll = async () => {
    const canDownload = gallery ? (!gallery.isLocked && !!gallery.isPaid) : false;
    if (isPreparing || !gallery || !canDownload) return;
    setIsPreparing(true);
    const zip = new JSZip();
    const items = gallery.items || [];
    
    try {
      for (let i = 0; i < items.length; i++) {
        setPreparationStep(`Fetching: ${i + 1} / ${items.length}`);
        const url = items[i].masterUrl || items[i].url;
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(items[i].fileName || `photo-${i + 1}.jpg`, blob);
      }
      setPreparationStep('Compiling Package...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${gallery.title || 'gallery'}.zip`);
    } catch (error) {
      toast({ variant: "destructive", title: "Package Error" });
    } finally {
      setIsPreparing(false);
      setPreparationStep('');
    }
  };

  // Synchronized Loading State
  if (isResolving || (galleryId && docLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/50">Synchronizing Luxury Assets...</p>
      </div>
    );
  }

  // Deny access if not available
  if (!isAvailable) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-8">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">Gallery Unavailable</h1>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto italic">
          The requested gallery could not be found or is currently restricted by the studio.
        </p>
        <Link href="/"><Button className="rounded-full px-10 bg-primary h-12 font-bold">Return Home</Button></Link>
      </div>
    );
  }

  // Show Password Gate if required and not unlocked
  if (requiresPassword && !isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <img src={gallery?.coverImage || 'https://picsum.photos/seed/hafash-hero/1920/1080'} className="w-full h-full object-cover grayscale blur-sm" alt="Background" />
        </div>
        <div className="w-full max-w-md relative z-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
           <div className="space-y-4">
             <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/5">
                <Key className="w-10 h-10 text-primary" />
             </div>
             <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">{gallery?.title}</h1>
             <p className="text-muted-foreground italic">This gallery is protected. Please enter the access code provided by the studio.</p>
           </div>
           
           <div className="bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
             <div className="space-y-2">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Code</Label>
               <div className="relative">
                 <Input 
                  type={showGatePass ? "text" : "password"} 
                  className={cn("h-14 rounded-2xl bg-background/50 border-border/50 text-center text-xl font-bold tracking-[0.3em] pl-12 pr-12", passwordError && "border-destructive focus-visible:ring-destructive")}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                 />
                 <button onClick={() => setShowGatePass(!showGatePass)} className="absolute right-4 top-4 text-muted-foreground hover:text-primary">
                    {showGatePass ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                 </button>
               </div>
               {passwordError && (
                 <p className="text-destructive text-[10px] font-bold uppercase mt-2 animate-bounce">Incorrect access code. Please try again.</p>
               )}
             </div>
             <Button className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3" onClick={verifyPassword} disabled={verifying}>
               {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
               Unlock Masterpieces
             </Button>
           </div>

           <Link href="/" className="inline-block pt-4">
             <Button variant="link" className="text-muted-foreground hover:text-primary font-bold uppercase text-[10px] tracking-widest">
               <ArrowLeft className="w-3 h-3 mr-2" /> Back to Hafash
             </Button>
           </Link>
        </div>
      </div>
    );
  }

  const photographerPlan = (profile?.planId || 'starter') as PlanId;
  const isCustomBrandingActive = photographerPlan !== 'starter';
  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;
  const canDownload = gallery ? (!gallery.isLocked && !!gallery.isPaid) : false;
  const showWatermark = gallery ? (!!gallery.isLocked || !gallery.isPaid) : true;
  const effectiveHeroImage = (isCustomBrandingActive && profile?.studioBanner) ? profile.studioBanner : (gallery?.coverImage || 'https://picsum.photos/seed/hafash-hero/1920/1080');

  // Final Gallery Content Render
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
                  {isPreparing ? preparationStep : "Download All"}
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
