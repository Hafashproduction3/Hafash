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
  FileText,
  Send,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
} from "@/components/dialog";
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
      setGalleryId(null);
      const cleanParam = galleryParam.trim();

      try {
        // Stage 1: Public Slug Resolution (Visitors)
        const publicSlugQuery = query(
          collection(firestore, 'galleries'),
          where('slug', '==', cleanParam.toLowerCase()),
          where('isPublic', '==', true),
          limit(1)
        );
        const publicSnap = await getDocs(publicSlugQuery);
        
        if (!publicSnap.empty) {
          setGalleryId(publicSnap.docs[0].id);
          setIsResolving(false);
          return;
        } 

        // Stage 2: Owner Slug Resolution (If logged in)
        if (user) {
          const ownerSlugQuery = query(
            collection(firestore, 'galleries'),
            where('slug', '==', cleanParam.toLowerCase()),
            where('userId', '==', user.uid),
            limit(1)
          );
          const ownerSnap = await getDocs(ownerSlugQuery);
          if (!ownerSnap.empty) {
            setGalleryId(ownerSnap.docs[0].id);
            setIsResolving(false);
            return;
          }
        }

        // Stage 3: Direct ID Fallback (Strict Format Check)
        if (/^[a-zA-Z0-9]{20}$/.test(cleanParam)) {
          setGalleryId(cleanParam);
        }
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

  // Security Verification
  const isOwner = useMemo(() => {
    if (!user?.uid || !gallery?.userId) return false;
    return user.uid === gallery.userId;
  }, [user?.uid, gallery?.userId]);

  const isAvailable = useMemo(() => {
    if (isResolving || docLoading) return false;
    if (!gallery) return false;
    return isOwner || gallery.isPublic === true;
  }, [gallery, isOwner, isResolving, docLoading]);

  // Luxury Welcome Experience Architecture (Safely Read)
  const welcomeTitle = gallery?.welcomeTitle || "";
  const welcomeMessage = gallery?.welcomeMessage || "";
  const welcomeScreenEnabled = !!gallery?.welcomeScreenEnabled;
  const clientRepliesEnabled = gallery?.clientRepliesEnabled !== false;
  const helpfulButtonEnabled = gallery?.helpfulButtonEnabled !== false;

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

  const handleSubmitReply = async (e?: React.FormEvent, manualText?: string) => {
    if (e) e.preventDefault();
    const textToSubmit = manualText || replyText;
    if (!textToSubmit.trim() || !galleryRef) return;
    
    setIsSubmittingReply(true);
    try {
      await updateDoc(galleryRef, {
        replies: arrayUnion({
          text: textToSubmit,
          createdAt: new Date().toISOString()
        })
      });
      if (!manualText) {
        setReplySuccess(true);
        setReplyText('');
        setTimeout(() => setReplySuccess(false), 5000);
      }
      toast({ title: "Feedback Sent", description: manualText ? "Helpful ❤️ confirmed." : "Your photographer has been notified internally." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submit Failed", description: err.message });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleHelpfulClick = () => {
    if (helpfulClicked) return;
    setHelpfulClicked(true);
    handleSubmitReply(undefined, "[System]: Client found the photographer note helpful ❤️");
  };

  // Synchronized Loading State
  if (isResolving || docLoading) {
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

  const photographerPlan = (profile?.planId || 'starter') as PlanId;
  const isCustomBrandingActive = photographerPlan !== 'starter';
  const studioName = gallery?.studioName || profile?.studioName || 'Professional Studio';
  const studioLogo = gallery?.studioLogo || profile?.studioLogo;
  const whatsappNumber = gallery?.whatsappNumber || profile?.whatsappNumber;
  const canDownload = gallery ? (!gallery.isLocked && !!gallery.isPaid) : false;
  const showWatermark = gallery ? (!!gallery.isLocked || !gallery.isPaid) : true;
  const effectiveHeroImage = (isCustomBrandingActive && profile?.studioBanner) ? profile.studioBanner : (gallery?.coverImage || 'https://picsum.photos/seed/hafash-hero/1920/1080');

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

            {gallery.photographerNote && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none rounded-full px-8 lg:px-10 h-12 lg:h-14 bg-white/10 border border-white/20 text-white hover:bg-white/20 font-bold gap-3 shadow-2xl backdrop-blur-md text-xs lg:text-sm">
                    💌 Photographer Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/50 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl max-w-2xl">
                  <DialogHeader className="mb-6">
                    <div className="flex flex-col items-center text-center">
                       {isCustomBrandingActive && studioLogo ? (
                         <img src={studioLogo} className="h-12 w-auto mb-4 object-contain" alt="Studio Logo" />
                       ) : (
                         <span className="text-xl font-headline font-bold text-primary italic mb-2">{studioName}</span>
                       )}
                       <DialogTitle className="text-2xl font-headline font-bold uppercase tracking-tight">Photographer's Note</DialogTitle>
                    </div>
                  </DialogHeader>
                  
                  <div className="space-y-8">
                     <p className="text-lg lg:text-xl font-headline italic leading-relaxed text-foreground/90 whitespace-pre-wrap text-center px-4">
                       "{gallery.photographerNote}"
                     </p>

                     <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          className={cn(
                            "rounded-full gap-2 font-bold transition-all h-10 px-6 border-primary/30",
                            helpfulClicked ? "bg-primary text-primary-foreground border-primary" : "text-primary hover:bg-primary/10"
                          )}
                          onClick={handleHelpfulClick}
                          disabled={helpfulClicked}
                        >
                          <Heart className={cn("w-4 h-4", helpfulClicked && "fill-current")} />
                          {helpfulClicked ? "Helpful!" : "Helpful"}
                        </Button>
                     </div>

                     <div className="pt-8 border-t border-border/20">
                        {replySuccess ? (
                           <div className="flex flex-col items-center justify-center py-4 text-center animate-in zoom-in-95 duration-500">
                              <div className="bg-green-500/10 p-2 rounded-full mb-2">
                                 <CheckCircle2 className="w-5 h-5 text-green-500" />
                              </div>
                              <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Reply Delivered</p>
                              <Button variant="link" className="text-[10px] mt-2 h-auto py-0 font-bold uppercase" onClick={() => setReplySuccess(false)}>Send Another</Button>
                           </div>
                        ) : (
                           <form onSubmit={handleSubmitReply} className="space-y-4">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Internal Feedback / Reply</Label>
                              <div className="relative">
                                 <Textarea 
                                    placeholder="Type your reply to the studio here..." 
                                    className="rounded-2xl bg-background/30 border-border/30 focus:border-primary/50 min-h-[80px] p-4 text-sm"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                 />
                                 <Button 
                                    type="submit" 
                                    size="icon" 
                                    className="absolute bottom-3 right-3 rounded-xl bg-primary text-primary-foreground h-10 w-10 shadow-lg hover:scale-105 transition-transform"
                                    disabled={isSubmittingReply || !replyText.trim()}
                                 >
                                    {isSubmittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                 </Button>
                              </div>
                              <p className="text-[9px] text-muted-foreground italic text-center">* This reply is saved internally and is only visible to your photographer.</p>
                           </form>
                        )}
                     </div>
                  </div>
                </DialogContent>
              </Dialog>
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

      <div className="max-w-7xl mx-auto px-6 mt-16 space-y-12">
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
