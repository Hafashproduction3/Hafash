"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Heart, 
  Download, 
  Loader2, 
  MessageCircle, 
  Share2, 
  ShieldAlert,
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  X,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, limit, arrayUnion } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HafashLoader } from '@/components/ui/hafash-loader';
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
  onSelect,
  priority
}: { 
  item: any, 
  showWatermark: boolean, 
  canDownload: boolean, 
  onFavorite: (id: string, current: boolean) => void, 
  onDownload: (item: any) => void,
  onSelect: (url: string) => void,
  priority?: boolean
}) => {
  return (
    <div 
      className="relative group break-inside-avoid overflow-hidden rounded-[2rem] border border-border/10 bg-card/20 cursor-zoom-in mb-8 shadow-xl transition-all duration-700 hover:shadow-primary/5" 
      onClick={() => onSelect(item.url)}
    >
      <img 
        src={item.url} 
        alt="Gallery Asset"
        className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110"
        loading={priority ? "eager" : "lazy"}
      />
      {showWatermark && <div className="luxury-watermark" />}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
        <div className="flex gap-4 scale-75 group-hover:scale-100 transition-transform duration-500">
          <Button 
            size="icon" 
            className={cn(
              "rounded-full h-16 w-16 border-none shadow-2xl transition-all", 
              item.isFavorite ? "bg-primary text-primary-foreground" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
            )} 
            onClick={(e) => { e.stopPropagation(); onFavorite(item.id, !!item.isFavorite); }}
          >
            <Heart className={cn("w-7 h-7", item.isFavorite ? "fill-current" : "")} />
          </Button>
          {canDownload && (
            <Button size="icon" className="rounded-full h-16 w-16 bg-white text-black hover:bg-gray-100 shadow-2xl transition-all" onClick={(e) => { e.stopPropagation(); onDownload(item); }}>
              <Download className="w-7 h-7" />
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
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState<string>('');
  
  // Security Logic
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Internal Note Reply State
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [helpfulClicked, setHelpfulClicked] = useState(false);

  // Secure Multi-Stage Resolution Logic
  useEffect(() => {
    async function resolve() {
      if (!firestore || !galleryParam) {
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      const cleanParam = galleryParam.trim();

      try {
        const slugQuery = query(
          collection(firestore, 'galleries'),
          where('slug', '==', cleanParam.toLowerCase()),
          limit(1)
        );
        const slugSnap = await getDocs(slugQuery);
        
        if (!slugSnap.empty) {
          setGalleryId(slugSnap.docs[0].id);
          return;
        } 

        if (/^[a-zA-Z0-9]{20}$/.test(cleanParam)) {
          setGalleryId(cleanParam);
          return;
        }

        setGalleryId(null);
      } catch (err: any) {
        console.error("Gallery resolution error:", err);
        setGalleryId(null);
      } finally {
        setIsResolving(false);
      }
    }
    resolve();
  }, [firestore, galleryParam]);

  const galleryRef = useMemo(() => {
    if (!firestore || !galleryId) return null;
    return doc(firestore, 'galleries', galleryId);
  }, [firestore, galleryId]);

  const { data: gallery, loading: docLoading } = useDoc(galleryRef);

  useEffect(() => {
    if (galleryId) {
      const stored = sessionStorage.getItem(`unlocked_gallery_${galleryId}`);
      if (stored === 'true') setIsUnlocked(true);
    }
  }, [galleryId]);

  const photographerRef = useMemo(() => {
    if (!firestore || !gallery?.userId) return null;
    return doc(firestore, 'users', gallery.userId);
  }, [firestore, gallery?.userId]);

  const { data: profile } = useDoc(photographerRef);

  const isOwner = useMemo(() => {
    if (!user?.uid || !gallery?.userId) return false;
    return user.uid === gallery.userId;
  }, [user?.uid, gallery?.userId]);

  const isAvailable = useMemo(() => {
    if (isResolving || (galleryId && docLoading) || authLoading) return false;
    if (!gallery) return false;
    return isOwner || gallery.isPublic === true;
  }, [gallery, isOwner, isResolving, docLoading, authLoading, galleryId]);

  const canDownload = useMemo(() => gallery ? (!gallery.isLocked && !!gallery.isPaid) : false, [gallery]);
  const showWatermark = useMemo(() => gallery ? (!!gallery.isLocked || !gallery.isPaid) : true, [gallery]);

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

  const handleDownloadAll = useCallback(async () => {
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
  }, [gallery, canDownload, isPreparing, toast]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery?.hashedPassword) return;
    setVerifying(true);
    setPasswordError(false);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashedInput === gallery.hashedPassword) {
        setIsUnlocked(true);
        if (galleryId) sessionStorage.setItem(`unlocked_gallery_${galleryId}`, 'true');
        toast({ title: "Access Granted" });
      } else {
        setPasswordError(true);
        toast({ variant: "destructive", title: "Access Denied" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Security Error" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitReply = useCallback(async (manualText?: string) => {
    const textToSubmit = manualText || replyText;
    if (!textToSubmit.trim() || !galleryRef) return;
    setIsSubmittingReply(true);
    try {
      await updateDoc(galleryRef, {
        replies: arrayUnion({ text: textToSubmit, createdAt: new Date().toISOString() })
      });
      if (!manualText) {
        setReplySuccess(true);
        setReplyText('');
        setTimeout(() => setReplySuccess(false), 5000);
      }
      toast({ title: "Feedback Sent" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submit Failed", description: err.message });
    } finally {
      setIsSubmittingReply(false);
    }
  }, [replyText, galleryRef, toast]);

  const handleHelpfulClick = useCallback(() => {
    if (helpfulClicked) return;
    setHelpfulClicked(true);
    handleSubmitReply("[System]: Client found the photographer note helpful ❤️");
  }, [helpfulClicked, handleSubmitReply]);

  if (isResolving || (galleryId && docLoading) || authLoading) {
    return (
      <HafashLoader text="Synchronizing Luxury Assets..." />
    );
  }

  if (!isAvailable) {
    const isPrivate = gallery && gallery.isPublic === false;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-destructive/10 p-10 rounded-full mb-10 ring-4 ring-destructive/5">
          <ShieldAlert className="w-16 h-16 text-destructive" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-headline font-bold mb-6 uppercase tracking-tighter">
          {isPrivate ? "Gallery Restricted" : "Vault Unavailable"}
        </h1>
        <p className="text-muted-foreground mb-12 max-w-sm mx-auto italic text-lg leading-relaxed">
          {isPrivate 
            ? "Access to this private collection has been restricted by the studio. Please contact your photographer for a verified access key."
            : "The requested visual collection could not be synchronized or has been migrated by the studio."}
        </p>
        <Link href="/"><Button className="rounded-full px-12 h-14 bg-primary font-bold text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">Return to Hafash</Button></Link>
      </div>
    );
  }

  if (!!gallery?.isPasswordProtected && !isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-15">
          <img src={gallery.coverImage} className="w-full h-full object-cover grayscale blur-md scale-110" alt="Background" />
        </div>
        <div className="w-full max-w-md relative z-10 space-y-12 animate-in fade-in zoom-in-95 duration-1000">
          <div className="text-center space-y-4">
            <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-primary/5 shadow-2xl">
              <KeyRound className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-headline font-bold uppercase tracking-tight text-white">{gallery.title}</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.4em] font-bold">Private Workspace Access</p>
          </div>
          <div className="bg-card/80 backdrop-blur-2xl border border-border/50 rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-10 lg:p-12 space-y-8">
              <p className="text-center text-sm text-muted-foreground italic leading-relaxed">
                This private session is protected by studio security. Please enter the unique access key provided by your photographer to view your masterpieces.
              </p>
              <form onSubmit={handlePasswordSubmit} className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Access Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 w-5 h-5 text-primary" />
                    <Input 
                      type="password" 
                      placeholder="••••••••••••" 
                      className={cn(
                        "pl-12 h-14 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 text-lg tracking-widest",
                        passwordError && "border-destructive/50 ring-4 ring-destructive/10"
                      )}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-xl shadow-2xl shadow-primary/20 gap-4 transition-all hover:scale-105 active:scale-95"
                  disabled={verifying || !passwordInput}
                >
                  {verifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Unlock className="w-6 h-6" />}
                  {verifying ? "Verifying..." : "Unlock Vault"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const photographerPlan = (profile?.planId || 'starter') as PlanId;
  const isCustomBrandingActive = photographerPlan !== 'starter';
  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;
  const effectiveHeroImage = (isCustomBrandingActive && profile?.studioBanner) ? profile.studioBanner : (gallery?.coverImage || 'https://picsum.photos/seed/hafash-hero/1920/1080');
  const hasNoteContent = !!(gallery?.photographerNote || gallery?.welcomeTitle || gallery?.welcomeMessage);

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-1000">
      <Button 
        variant="ghost" size="icon" 
        className="fixed top-6 left-6 lg:top-10 lg:left-10 z-[60] h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-black/40 backdrop-blur-xl text-white border border-white/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xl"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-6 h-6 lg:w-7 lg:h-7" />
      </Button>

      <div className={cn(
        "h-[85vh] lg:h-[90vh] relative overflow-hidden flex flex-col items-center justify-center bg-card shadow-2xl transition-all duration-1000",
        isCustomBrandingActive && profile?.studioBanner && "rounded-b-[4rem] lg:rounded-b-[6rem]"
      )}>
        <img src={effectiveHeroImage} className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105 animate-[slow-zoom_20s_infinite_alternate]" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
        
        <div className="relative z-10 text-center px-6 max-w-5xl space-y-10">
          <div className="flex flex-col items-center">
            {isCustomBrandingActive ? (
              <div className="flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-top-6 duration-1000">
                {studioLogo ? (
                  <img src={studioLogo} className="h-20 lg:h-24 w-auto mb-4 object-contain drop-shadow-2xl" alt="Logo" />
                ) : (
                  <span className="text-4xl lg:text-6xl font-headline font-bold text-white uppercase tracking-tighter mb-2 drop-shadow-2xl">{studioName}</span>
                )}
                {profile?.photographerName && (
                  <div className="flex items-center gap-4">
                    <div className="h-px w-8 bg-primary/50" />
                    <p className="text-primary italic font-headline tracking-[0.4em] text-xs lg:text-sm uppercase drop-shadow-lg">{profile.photographerName}</p>
                    <div className="h-px w-8 bg-primary/50" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-top-6 duration-1000">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img src="/hafash-logo.png" className="h-[50px] w-auto drop-shadow-2xl" alt="Logo" />
                  <span className="text-4xl sm:text-6xl lg:text-9xl font-headline font-bold text-white italic drop-shadow-2xl">Hafash.pk</span>
                </div>
                <span className="text-[10px] lg:text-[12px] font-bold tracking-[0.6em] text-primary/80 uppercase drop-shadow-lg">LUXURY GALLERY DELIVERY</span>
              </div>
            )}
          </div>

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-headline font-bold text-white uppercase tracking-tight leading-[1.1] drop-shadow-2xl">{gallery.title}</h1>
            <p className="text-2xl lg:text-3xl italic text-primary font-headline drop-shadow-xl">{gallery.clientName}</p>
            <div className="flex items-center justify-center gap-6 text-white/80 uppercase tracking-[0.4em] text-[10px] lg:text-[12px] font-bold">
              <span>{gallery.category}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{gallery.date}</span>
            </div>
          </div>
          
          <div className="mt-14 lg:mt-20 flex flex-wrap justify-center items-center gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            {whatsappNumber && (
              <Button className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-4 shadow-2xl text-sm lg:text-base transition-all hover:scale-105 active:scale-95" onClick={() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`, '_blank')}>
                <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6" /> Contact Studio
              </Button>
            )}

            {hasNoteContent && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-white/10 border border-white/20 text-white hover:bg-white/20 font-bold gap-4 shadow-2xl backdrop-blur-xl text-sm lg:text-base transition-all hover:scale-105">
                    <Sparkles className="w-5 h-5" /> Photographer's Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/50 rounded-[3rem] p-10 lg:p-16 shadow-2xl max-w-3xl overflow-hidden ring-1 ring-white/10">
                  <DialogHeader className="mb-10">
                    <div className="flex flex-col items-center text-center space-y-6">
                      {isCustomBrandingActive && studioLogo ? (
                        <img src={studioLogo} className="h-16 w-auto mb-2 object-contain" alt="Studio Logo" />
                      ) : (
                        <span className="text-2xl font-headline font-bold text-primary italic mb-2">{studioName}</span>
                      )}
                      <DialogTitle className="text-3xl lg:text-4xl font-headline font-bold uppercase tracking-tight leading-tight">
                        {gallery?.welcomeTitle || "Message From Your Photographer"}
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="space-y-10">
                    {gallery?.welcomeMessage && <p className="text-center text-muted-foreground text-sm uppercase tracking-[0.3em] font-bold px-4">{gallery.welcomeMessage}</p>}
                    {gallery.photographerNote && <p className="text-2xl lg:text-3xl font-headline italic leading-relaxed text-foreground/90 whitespace-pre-wrap text-center px-6">"{gallery.photographerNote}"</p>}
                    <div className="flex justify-center">
                      <Button variant="outline" className={cn("rounded-full gap-3 font-bold transition-all h-12 px-8 border-primary/30 text-base shadow-lg", helpfulClicked ? "bg-primary text-primary-foreground border-primary" : "text-primary hover:bg-primary/10")} onClick={handleHelpfulClick} disabled={helpfulClicked}>
                        <Heart className={cn("w-5 h-5", helpfulClicked && "fill-current")} />
                        {helpfulClicked ? "Helpful!" : "Appreciate this"}
                      </Button>
                    </div>
                    {(gallery?.clientRepliesEnabled !== false) && (
                      <div className="pt-10 border-t border-border/20">
                        {replySuccess ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in-95 duration-500">
                            <div className="bg-green-500/10 p-4 rounded-full mb-4 ring-4 ring-green-500/5">
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-sm font-bold text-green-500 uppercase tracking-[0.3em]">Reply Delivered to Studio</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <Label className="text-[11px] font-bold uppercase tracking-[0.4em] text-muted-foreground ml-1">Send a reply to the studio</Label>
                            <div className="relative">
                              <Textarea placeholder="Type your beautiful thoughts or requests here..." className="rounded-[2rem] bg-background/30 border-border/30 focus:border-primary/50 min-h-[100px] p-6 text-base italic shadow-inner custom-scrollbar" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                              <Button size="icon" className="absolute bottom-4 right-4 rounded-2xl bg-primary text-primary-foreground h-12 w-12 shadow-2xl hover:scale-105 transition-transform" onClick={() => handleSubmitReply()} disabled={isSubmittingReply || !replyText.trim()}>
                                {isSubmittingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {canDownload && gallery.items?.length > 0 && (
              <Button 
                className={cn("flex-1 sm:w-auto rounded-full px-10 lg:px-12 h-14 lg:h-16 bg-primary/20 border border-primary/40 text-white hover:bg-primary/30 font-bold gap-4 shadow-2xl backdrop-blur-xl text-sm lg:text-base transition-all", isPreparing && "opacity-70 cursor-wait")}
                onClick={handleDownloadAll}
                disabled={isPreparing}
              >
                {isPreparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                {isPreparing ? preparationStep : "Full Gallery Download"}
              </Button>
            )}

            <Button variant="outline" className="flex-1 sm:flex-none rounded-full px-10 lg:px-12 h-14 lg:h-16 border-white/30 text-white hover:bg-white/10 gap-4 backdrop-blur-xl text-sm lg:text-base transition-all" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied", description: "Gallery access link is ready to share." }); }}>
              <Share2 className="w-5 h-5 lg:w-6 lg:h-6" /> Share
            </Button>
          </div>
        </div>
        
        {/* Floating Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-2 opacity-50">
           <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-24 space-y-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 lg:gap-12 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700">
          {gallery.items?.map((item: any, idx: number) => (
            <GalleryItem 
              key={item.id}
              item={item}
              showWatermark={showWatermark}
              canDownload={canDownload}
              onFavorite={handleFavorite}
              onDownload={handleDownloadSingle}
              onSelect={setSelectedImage}
              priority={idx < 6}
            />
          ))}
        </div>

        {(!gallery.items || gallery.items.length === 0) && (
          <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[4rem] bg-card/10 animate-in fade-in duration-1000">
             <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
             <p className="text-2xl text-muted-foreground font-headline italic">Your masterpieces are being meticulously prepared...</p>
          </div>
        )}
      </div>

      <footer className="mt-40 pt-24 border-t border-border/20 px-8">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 opacity-50 hover:opacity-100 transition-all duration-700 cursor-default">
              <img src="/hafash-logo.png" alt="Hafash" className="h-10 w-auto grayscale brightness-200" />
              <div className="h-8 w-px bg-border/50" />
              <span className="text-[11px] font-bold uppercase tracking-[0.6em] text-muted-foreground">Deliver Memories Beautifully</span>
            </div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] italic">© 2026 {studioName}. Powered by Hafash.pk</p>
          </div>
        </div>
      </footer>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-500" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
            <img src={selectedImage} className="max-w-full max-h-[95vh] object-contain rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5" alt="Fullscreen" />
            {showWatermark && <div className="luxury-watermark" />}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 lg:top-12 lg:right-12 text-white h-12 w-12 lg:h-16 lg:w-16 hover:bg-primary hover:text-primary-foreground rounded-full transition-all shadow-2xl">
            <X className="w-8 h-8 lg:w-10 lg:h-10" />
          </Button>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
