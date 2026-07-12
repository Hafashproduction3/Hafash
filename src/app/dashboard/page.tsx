
"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { 
  Users, 
  ImageIcon, 
  Eye, 
  Plus, 
  MoreVertical, 
  Share2, 
  Trash2, 
  Lock, 
  Unlock,
  Loader2,
  Heart,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useEffect, useState, useCallback, memo } from 'react';

// Memoized Stat Card for better performance
const StatCard = memo(({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
  <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <h3 className="text-3xl font-headline font-bold mt-1">{value}</h3>
    </div>
    <div className="p-3 bg-primary/10 rounded-2xl">
      {icon}
    </div>
  </Card>
));
StatCard.displayName = 'StatCard';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [galleryToDelete, setGalleryToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) {
      return null;
    }
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const handleShare = useCallback((slug: string) => {
    const url = `${window.location.origin}/gallery/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Gallery link has been copied to clipboard.",
    });
  }, [toast]);

  const confirmDelete = useCallback(() => {
    if (!firestore || !user || !galleryToDelete) return;
    
    const idToDelete = galleryToDelete;
    setGalleryToDelete(null);
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }
    
    const docRef = doc(firestore, 'galleries', idToDelete);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Deleted", description: "Gallery has been removed." });
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Delete Failed", description: err.message });
        }
      });
  }, [firestore, user, galleryToDelete, toast]);

  const toggleLock = useCallback((id: string, currentStatus: boolean) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, 'galleries', id);
    const updateData = { isLocked: !currentStatus };

    updateDoc(docRef, updateData)
      .then(() => {
        toast({ title: "Updated", description: `Gallery ${currentStatus ? 'unlocked' : 'locked'}.` });
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Update Failed", description: err.message });
        }
      });
  }, [firestore, user, toast]);

  const stats = useMemo(() => {
    const safeGalleries = galleries || [];
    const totalViews = safeGalleries.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
    return {
      count: String(safeGalleries.length),
      views: String(totalViews)
    };
  }, [galleries]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-xs">Syncing Studio Data...</p>
      </div>
    );
  }

  const safeGalleries = galleries || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold">Studio Overview</h1>
          <p className="text-muted-foreground mt-2">Manage your luxury galleries and clients.</p>
        </div>
        <Link href="/events/create" prefetch>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-12 font-bold flex gap-2">
            <Plus className="w-5 h-5" />
            Create New Event
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Galleries" 
          value={stats.count} 
          icon={<ImageIcon className="w-5 h-5 text-primary" />} 
        />
        <StatCard 
          title="Total Clients" 
          value={stats.count} 
          icon={<Users className="w-5 h-5 text-primary" />} 
        />
        <StatCard 
          title="Gallery Views" 
          value={stats.views} 
          icon={<Eye className="w-5 h-5 text-primary" />} 
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-headline font-bold border-b border-border/50 pb-4">Recent Events</h2>
        
        {safeGalleries.length === 0 ? (
          <div className="py-20 text-center bg-card/30 rounded-3xl border border-dashed border-border/50">
            <p className="text-muted-foreground italic">You haven't created any events yet.</p>
            <Link href="/events/create">
              <Button variant="link" className="text-primary mt-2">Create your first gallery</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {safeGalleries.map((event) => {
              const favoritesCount = Array.isArray(event.items) 
                ? event.items.filter((i: any) => i.isFavorite).length 
                : 0;
              return (
                <Card key={event.id} className="overflow-hidden border-border/30 bg-card/50 group hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img 
                      src={event.coverImage} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 ${event.isLocked ? 'bg-destructive/20 text-destructive-foreground border border-destructive/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                        {event.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {event.isLocked ? 'Downloads Locked' : 'Downloads Open'}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-headline font-bold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.clientName} • {event.category} • {event.date}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border/50 text-foreground">
                          <DropdownMenuItem onClick={() => handleShare(event.slug || event.id)}>
                            <Share2 className="w-4 h-4 mr-2" /> Share Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleLock(event.id, event.isLocked)}>
                            {event.isLocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                            {event.isLocked ? 'Unlock Downloads' : 'Lock Downloads'}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/events/${event.id}/upload`}>
                              <ImageIcon className="w-4 h-4 mr-2" /> Add Photos
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setGalleryToDelete(event.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex gap-4 mb-6 py-3 border-y border-border/30 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-primary" />
                        <span>{event.viewCount || 0} Views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-3 h-3 text-primary" />
                        <span>{favoritesCount} Favorites</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Download className="w-3 h-3 text-primary" />
                        <span>0 Downloads</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button variant="outline" size="sm" className="flex-1 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/50" asChild>
                        <Link href={`/gallery/${event.slug || event.id}`}>Preview Gallery</Link>
                      </Button>
                      <Button size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold" asChild>
                        <Link href={`/events/${event.id}/manage`}>Manage</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!galleryToDelete} onOpenChange={(open) => !open && setGalleryToDelete(null)}>
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
    </div>
  );
}
