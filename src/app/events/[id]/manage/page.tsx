"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Share2, 
  MessageCircle, 
  Link as LinkIcon, 
  Lock, 
  Unlock,
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  Loader2,
  ShieldCheck,
  CreditCard,
  Globe,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [coverToConfirm, setCoverToConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading, error } = useDoc(eventRef);

  // Proper reactive navigation after deletion
  useEffect(() => {
    if (isDeleting && !event && !dataLoading && !showDeleteDialog) {
      router.replace('/dashboard');
    }
  }, [isDeleting, event, dataLoading, showDeleteDialog, router]);

  const photographerRef = useMemo(() => {
    if (!firestore || !event?.userId || !user || user.uid !== event.userId) return null;
    return doc(firestore, 'users', event.userId);
  }, [firestore, event?.userId, user?.uid]);

  const { data: profile } = useDoc(photographerRef);

  // Field Repair & Metadata Sync Logic
  useEffect(() => {
    if (event && eventRef) {
      const updates: any = {};
      
      // 1. Ensure isPublic is set
      if (event.isPublic === undefined) {
        updates.isPublic = true;
      }
      
      // 2. Sync Studio Branding for Public Access (Clients can't read users collection)
      if (profile) {
        if (event.studioName !== profile.studioName) updates.studioName = profile.studioName || "";
        if (event.whatsappNumber !== profile.whatsappNumber) updates.whatsappNumber = profile.whatsappNumber || "";
        if (event.studioLogo !== profile.studioLogo) updates.studioLogo = profile.studioLogo || "";
      }

      if (Object.keys(updates).length > 0) {
        updateDoc(eventRef, updates).catch((err) => {
          if (err.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: eventRef.path,
               operation: 'update',
               requestResourceData: updates
             }));
          }
        });
      }
    }
  }, [event, eventRef, profile]);

  const favoritesCount = useMemo(() => {
    if (!event || !Array.isArray(event.items)) return 0;
    return event.items.filter((i: any) => i.isFavorite).length;
  }, [event?.items]);

  if (authLoading || dataLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  // Only show the "Not found" guard if we aren't currently deleting the event.
  // This prevents the page from unmounting the AlertDialog prematurely.
  if (!isDeleting && (error || !event)) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <Button className="mt-6" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const handleCopyLink = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied!" });
    }
  };

  const confirmDelete = async () => {
    if (!eventRef) return;
    
    // 1. Signal deletion start and close dialog state immediately.
    setIsDeleting(true);
    setShowDeleteDialog(false);
    
    // Fallback: Manually restore pointer-events on the body
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }
    
    try {
      await deleteDoc(eventRef);
      toast({ title: "Event Deleted" });
    } catch (err: any) {
      setIsDeleting(false);
      if (err.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: eventRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({ variant: "destructive", title: "Delete Failed", description: err.message });
      }
    } finally {
      // Guarantee interactivity restoration
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
    }
  };

  const updateVisibility = (isPublic: boolean) => {
    if (!eventRef) return;
    const updateData = { isPublic };
    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ title: "Visibility Updated", description: `Gallery is now ${isPublic ? 'Public' : 'Private'}.` });
      })
      .catch((err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: eventRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      });
  };

  const updatePaymentAndLockStatus = (isPaid: boolean) => {
    if (!eventRef) return;
    const updateData = { 
      isPaid: isPaid,
      isLocked: !isPaid 
    };

    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ 
          title: "Status Updated", 
          description: isPaid 
            ? "Payment Received. Downloads are now UNLOCKED." 
            : "Payment Pending. Downloads are now LOCKED." 
        });
      })
      .catch((err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: eventRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      });
  };

  const handleWhatsAppDelivery = () => {
    const whatsapp = event?.whatsappNumber || profile?.whatsappNumber;
    if (!whatsapp || typeof window === 'undefined') return;
    const cleanedNumber = whatsapp.replace(/\D/g, '');
    const message = `Check out your luxury gallery: ${origin}/gallery/${event?.slug || event?.id}`;
    window.open(`https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSetCover = (imageUrl: string) => {
    if (!eventRef) return;
    const updateData = { coverImage: imageUrl };

    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ title: "Cover Updated", description: "Gallery cover has been synchronized." });
      })
      .catch((err) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: eventRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      })
      .finally(() => setCoverToConfirm(null));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">{event?.title}</h1>
        </div>
        <div className="flex gap-3">
          {event && (
            <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
               <Button variant="outline" className="rounded-full gap-2">
                 <Eye className="w-4 h-4" /> Preview
               </Button>
            </Link>
          )}
          <Button variant="destructive" className="rounded-full gap-2" onClick={() => setShowDeleteDialog(true)}>
             <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
                <Share2 className="w-5 h-5 text-primary" /> Delivery Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Preview URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate font-mono">
                    {origin}/gallery/{event?.slug || event?.id}
                  </div>
                  <Button size="icon" className="rounded-xl" onClick={() => handleCopyLink(`${origin}/gallery/${event?.slug || event?.id}`)}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(event?.whatsappNumber || profile?.whatsappNumber) && (
                  <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3" onClick={handleWhatsAppDelivery}>
                    <MessageCircle className="w-5 h-5" /> WhatsApp Delivery
                  </Button>
                )}
                <Button className="h-14 rounded-2xl bg-primary font-bold gap-3" onClick={() => handleCopyLink(`${origin}/gallery/${event?.slug || event?.id}`)}>
                  <LinkIcon className="w-5 h-5" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className={cn(
              "rounded-3xl p-6 flex flex-col justify-between space-y-4 transition-all",
              event?.isPublic ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  event?.isPublic ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {event?.isPublic ? <Globe className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold">Visibility</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {event?.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest">Public</span>
                <Switch 
                  checked={!!event?.isPublic} 
                  onCheckedChange={updateVisibility}
                />
              </div>
            </Card>

            <Card className={cn(
              "rounded-3xl p-6 flex flex-col justify-between space-y-4 transition-all",
              event?.isPaid ? "bg-green-500/5 border-green-500/20" : "bg-muted/30 border-border/50"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  event?.isPaid ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                )}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold">Payment Status</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {event?.isPaid ? 'Paid & Unlocked' : 'Pending & Locked'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest">Received</span>
                <Switch 
                  checked={!!event?.isPaid} 
                  onCheckedChange={updatePaymentAndLockStatus}
                />
              </div>
            </Card>
          </div>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-primary" /> Asset Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Cover Photo</label>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Current Cover</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {event?.items?.map((item: any) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "aspect-[4/3] relative rounded-xl overflow-hidden border-2 transition-all group cursor-pointer",
                        event?.coverImage === item.url ? "border-primary ring-2 ring-primary/20" : "border-border/30 hover:border-primary/50"
                      )}
                      onClick={() => setCoverToConfirm(item.url)}
                    >
                      <img src={item.url} className="w-full h-full object-cover" alt="Gallery Asset" />
                      {event?.coverImage === item.url && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-lg">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="outline" size="sm" className="rounded-full text-[10px] font-bold uppercase tracking-tighter bg-white/10 border-white/40 text-white hover:bg-white hover:text-black">
                          Set as Cover
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!event?.items || event.items.length === 0) && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-border/20 rounded-[2rem]">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-sm text-muted-foreground italic">No assets available to select as cover.</p>
                      <Link href={`/events/${id}/upload`}>
                        <Button variant="link" className="text-primary mt-2">Upload master assets</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 py-4">
              <CardTitle className="text-[10px] uppercase tracking-widest text-primary font-bold">Event Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Masterpieces</span>
                <span className="font-bold">{event?.items?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Client Favorites</span>
                <span className="font-bold text-primary">{favoritesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Views</span>
                <span className="font-bold">{event?.viewCount || 0}</span>
              </div>
              <Separator className="my-2" />
              <Link href={`/events/${id}/upload`}>
                <Button className="w-full rounded-xl gap-2 h-12">
                  <ImageIcon className="w-4 h-4" /> Add Photos
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <div className="bg-primary/10 rounded-3xl p-6 border border-primary/20 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h5 className="font-bold text-sm uppercase tracking-widest">Studio Flow Sync</h5>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All changes are synced in real-time. Clients viewing the gallery will see visibility or payment updates immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-destructive/10 p-4 rounded-full">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Delete Gallery?</AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-4 py-2">
              <p className="font-bold text-foreground text-center">This action is permanent and cannot be undone.</p>
              <div className="bg-muted/30 p-4 rounded-2xl space-y-3">
                <p className="font-semibold text-xs uppercase tracking-widest text-primary">If you delete this gallery:</p>
                <ul className="text-xs space-y-2 list-disc pl-4">
                  <li>Clients will immediately lose access to the gallery.</li>
                  <li>The gallery link will stop working.</li>
                  <li>All gallery information associated with this gallery will be permanently removed.</li>
                </ul>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1" 
              onClick={confirmDelete}
            >
              Delete Gallery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Cover Confirmation Dialog */}
      <AlertDialog open={!!coverToConfirm} onOpenChange={(open) => !open && setCoverToConfirm(null)}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Set Cover Photo?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center">
              This image will become the gallery cover shown on the Dashboard and the public gallery page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex-1" 
              onClick={() => coverToConfirm && handleSetCover(coverToConfirm)}
            >
              Set Cover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
