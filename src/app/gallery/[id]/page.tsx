"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Download, 
  Loader2, 
  X, 
  Lock, 
  Unlock,
  MessageCircle, 
  Share2, 
  ShieldAlert,
  Globe,
  Clock,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { HAFASH_PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/plans';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Password protection state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const viewIncremented = useRef<string | null>(null);

  const effectiveHeroImage = useMemo(() => {
    // Moved to top and handle profile data check
    return 'https://picsum.photos/seed/hafash-hero/1920/1080';
  }, []);

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
          const qPrivate = query(
            collection(firestore, 'galleries'), 
            where('slug', '==', slugAttempt)
          );
          const privateSnap = await getDocs(qPrivate);
          if (!privateSnap.empty) {
            setGalleryId(privateSnap.docs[0].id);
          } else if (cleanParam.length > 15) {
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

  // Check session persistence for password gate
  useEffect(() => {
    if (galleryId) {
      const unlocked = sessionStorage.getItem(`hafash_unlocked_${galleryId}`);
      if (unlocked === 'true') setIsUnlocked(true);
    }
  }, [galleryId]);

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

  const isCustomBrandingActive = photographerPlan.id !== 'starter';

  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const tagline = profile?.photographerName;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;

  const canDownload = useMemo(() => {
    return gallery ? (gallery.isLocked === false && gallery.isPaid === true) : false;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const showWatermark = useMemo(() => {
    return gallery ? (gallery.isLocked === true || gallery.isPaid === false) : true;
  }, [gallery?.isLocked, gallery?.isPaid]);

  const hashPassword = useCallback(async (password: string) => {
    if (!password) return '';
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const handleVerifyPassword = async () => {
    if (!passwordInput || verifying) return;
    setVerifying(true);
    const inputHash = await hashPassword(passwordInput);
    if (inputHash === gallery?.password) {
      setIsUnlocked(true);
      sessionStorage.setItem(`hafash_unlocked_${galleryId}`, 'true');
      toast({ title: "Access Granted", description: "Welcome to your luxury gallery." });
    } else {
      setPasswordError(true);
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect gallery password." });
    }
    setVerifying(false);
  };

  const handleFavorite = useCallback((itemId: string, isCurrentlyFavorite: boolean) => {
    if (!firestore || !gallery || !galleryId) return;
    const gRef = doc(firestore, 'galleries', galleryId);
    const updatedItems = (gallery.items || []).map((item: any) => 
      item.id === itemId ? { ...item, isFavorite: !isCurrentlyFavorite } : item
    );
    const updateData = { items: updatedItems };

    updateDoc(gRef, { items: updatedItems })
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
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/50">Resolving Luxury Gallery...</p>
      </div>
    );
  }

  if (galleryError || !gallery) {
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

  // --- Password Gate ---
  if (!gallery.isPublic && !isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="max-w-md w-full relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-700">
           <div className="text-center space-y-6">
              <div className="flex flex-col items-center gap-1">
                 <img src="/hafash-logo.png" alt="Hafash" className="h-[40px] lg:h-[60px] w-auto" />
                 <span className="text-2xl font-headline font-bold text-primary italic">Hafash.pk</span>
              </div>
              <div className="space-y-2">
                 <h1 className="text-3xl font-headline font-bold tracking-tight text-white uppercase">Protected Gallery</h1>
                 <p className="text-sm text-muted-foreground italic">A secure password is required to view these masterpieces.</p>
              </div>
           </div>

           <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardContent className="p-10 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Access Password</Label>
                       <div className="relative">
                          <Lock className="absolute left-4 top-4 w-4 h-4 text-primary" />
                          <Input 
                             type="password"
                             placeholder="Enter Password"
                             value={passwordInput}
                             onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                             className={cn(
                               "pl-11 h-14 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 text-lg",
                               passwordError && "border-destructive ring-1 ring-destructive"
                             )}
                             onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                          />
                       </div>
                       {passwordError && (
                          <p className="text-[10px] text-destructive font-bold uppercase tracking-widest mt-2 text-center animate-pulse">Incorrect password. Please try again.</p>
                       )}
                    </div>
                 </div>

                 <Button 
                    className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                    onClick={handleVerifyPassword}
                    disabled={verifying}
                 >
                    {verifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Unlock className="w-6 h-6 mr-2" />}
                    {verifying ? "Verifying Access..." : "Unlock Gallery"}
                 </Button>

                 <div className="text-center pt-4">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.3em]">Encrypted Access Portal</p>
                 </div>
              </CardContent>
           </Card>

           <div className="text-center">
              <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-primary gap-2" onClick={() => router.back()}>
                 <ArrowLeft className="w-4 h-4" /> Return Back
              </Button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      {/* Floating Back Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 lg:top-8 lg:left-8 z-[60] h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/10"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
      </Button>

      <div className={cn(
        "h-[80vh] lg:h-[85vh] relative overflow-hidden flex flex-col items-center justify-center bg-card shadow-2xl transition-all",
        isCustomBrandingActive && profile?.studioBanner && "rounded-b-[2.5rem] lg:rounded-b-[4rem]"
      )}>
        <Image 
          src={isCustomBrandingActive && profile?.studioBanner ? profile.studioBanner : (gallery.coverImage || 'https://picsum.photos/seed/hafash-empty/1920/1080')} 
          fill 
          className="absolute inset-0 w-full h-full object-cover opacity-80" 
          alt="Gallery Cover" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="flex flex-col items-center mb-6">
            {/* Custom Branding Header (Premium Plans) */}
            {isCustomBrandingActive ? (
              <div className="flex flex-col items-center mb-8">
                {studioLogo ? (
                  <Image 
                    src={studioLogo} 
                    width={240} 
                    height={100} 
                    className="h-16 lg:h-20 w-auto mb-6 object-contain" 
                    alt="Studio Logo" 
                  />
                ) : (
                  <span className="text-3xl lg:text-5xl font-headline font-bold text-white uppercase tracking-tighter mb-4">{studioName}</span>
                )}
                {tagline && (
                  <span className="text-[10px] lg:text-xs font-bold tracking-[0.4em] text-primary uppercase">{tagline}</span>
                )}
              </div>
            ) : (
              /* Hafash Default Header (Starter Plan) */
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[40px] lg:h-[70px] w-auto" />
                  <span className="text-3xl sm:text-5xl lg:text-9xl font-headline font-bold text-white italic leading-none">Hafash.pk</span>
                </div>
                <span className="text-[9px] lg:text-[10px] font-bold tracking-[0.5em] text-primary/70 uppercase leading-none block z-10">LUXURY GALLERY DELIVERY</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-headline font-bold mb-6 text-white uppercase tracking-tight leading-tight">{gallery.title}</h1>
          
          {gallery.description && (
            <div className="max-w-sm lg:max-w-md mx-auto mb-10 lg:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <div className="bg-white/5 border border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-2xl group hover:border-primary/20 transition-all">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="text-center space-y-1">
                       <h3 className="font-headline font-bold text-lg lg:text-xl text-white">Message from Photographer</h3>
                       <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-white/40 font-bold">A personal message has been left for you</p>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="rounded-full px-8 lg:px-10 h-10 lg:h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs lg:text-sm shadow-xl shadow-primary/10 mt-2">
                          Read Message
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-xl bg-card border-border/50 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-14 shadow-2xl overflow-hidden ring-0">
                        <DialogHeader>
                          <div className="flex flex-col items-center text-center gap-4 mb-8">
                             <div className="h-14 lg:h-16 w-14 lg:w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                               <Mail className="w-6 lg:w-8 h-6 lg:h-8" />
                             </div>
                             <div className="space-y-1">
                               <DialogTitle className="text-2xl lg:text-3xl font-headline font-bold">A Personal Note</DialogTitle>
                               <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Direct from the studio</p>
                             </div>
                          </div>
                        </DialogHeader>
                        
                        <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                           <div className="relative text-center">
                             <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words italic text-lg lg:text-xl px-2">
                               {gallery.description}
                             </p>
                           </div>
                        </div>

                        <div className="mt-10 flex justify-center">
                          <DialogClose asChild>
                            <Button variant="outline" className="rounded-full px-10 h-11 lg:h-12 border-border/50 hover:bg-primary/5 hover:text-primary transition-all font-bold text-xs lg:text-sm">
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
                {isPreparing && (
                  <div className="flex items-center gap-2 text-[8px] lg:text-[9px] uppercase font-bold text-primary animate-pulse">
                    <Clock className="w-3 h-3" /> {preparationStep}
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" className="flex-1 sm:flex-none rounded-full px-8 lg:px-10 h-12 lg:h-14 border-white/40 text-white hover:bg-white/10 gap-3 backdrop-blur-md text-xs lg:text-sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied" }); }}>
              <Share2 className="w-4 h-4 lg:w-5 lg:h-5" /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex justify-between items-center mb-10 lg:mb-12 border-b border-border/20 pb-8">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="h-10 lg:h-12 w-10 lg:w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Globe className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-headline font-bold uppercase tracking-widest">Masterpieces</h2>
              <p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Client Selection Enabled</p>
            </div>
          </div>
        </div>

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

      {/* Luxury Footer Branding */}
      <footer className="mt-20 pt-16 border-t border-border/20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col items-center gap-6">
            {isCustomBrandingActive && (
              <div className="space-y-2">
                <h4 className="text-xl font-headline font-bold">{studioName}</h4>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Original Coverage & Fulfillment</p>
              </div>
            )}
            
            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500 mt-4">
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

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2rem] lg:rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl lg:text-2xl font-headline">Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm lg:text-base">
              Your studio's current plan limits high-speed batch downloads. Please upgrade to continue with this delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-primary font-bold" onClick={() => router.push('/storage')}>Upgrade Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
