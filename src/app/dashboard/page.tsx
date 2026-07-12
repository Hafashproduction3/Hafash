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
import { Skeleton } from "@/components/ui/skeleton";
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useEffect, useState, useCallback, memo } from 'react';

const StatCard = memo(({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading?: boolean }) => (
  <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      {loading ? (
        <Skeleton className="h-10 w-16 mt-1 rounded-lg" />
      ) : (
        <h3 className="text-3xl font-headline font-bold mt-1">{value}</h3>
      )}
    </div>
    <div className="p-3 bg-primary/10 rounded-2xl">
      {icon}
    </div>
  </Card>
));
StatCard.displayName = 'StatCard';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [galleryToDelete, setGalleryToDelete] = useState<string | null>(null);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
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
    const docRef = doc(firestore, 'galleries', idToDelete);
    deleteDoc(docRef).catch((err) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
      }
    });
  }, [firestore, user, galleryToDelete]);

  const toggleLock = useCallback((id: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'galleries', id);
    updateDoc(docRef, { isLocked: !currentStatus });
  }, [firestore]);

  const stats = useMemo(() => {
    const safeGalleries = galleries || [];
    const totalViews = safeGalleries.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
    return {
      count: String(safeGalleries.length),
      views: String(totalViews)
    };
  }, [galleries]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold">Studio Overview</h1>
          <p className="text-muted-foreground mt-2">Manage your luxury galleries and clients.</p>
        </div>
        <Link href="/events/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-12 font-bold flex gap-2">
            <Plus className="w-5 h-5" />
            Create New Event
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Galleries" value={stats.count} loading={dataLoading && !galleries} icon={<ImageIcon className="w-5 h-5 text-primary" />} />
        <StatCard title="Total Clients" value={stats.count} loading={dataLoading && !galleries} icon={<Users className="w-5 h-5 text-primary" />} />
        <StatCard title="Gallery Views" value={stats.views} loading={dataLoading && !galleries} icon={<Eye className="w-5 h-5 text-primary" />} />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-headline font-bold border-b border-border/50 pb-4">Recent Events</h2>
        
        {dataLoading && !galleries ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] rounded-3xl" />
            <Skeleton className="h-[400px] rounded-3xl" />
          </div>
        ) : !galleries || galleries.length === 0 ? (
          <div className="py-20 text-center bg-card/30 rounded-3xl border border-dashed border-border/50">
            <p className="text-muted-foreground italic">You haven't created any events yet.</p>
            <Link href="/events/create">
              <Button variant="link" className="text-primary mt-2">Create your first gallery</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {galleries.map((event) => (
              <Card key={event.id} className="overflow-hidden border-border/30 bg-card/50 group hover:border-primary/50 transition-all duration-300">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute top-4 right-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 ${event.isLocked ? 'bg-destructive/20 text-destructive-foreground border border-destructive/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                      {event.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {event.isLocked ? 'Locked' : 'Open'}
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-headline font-bold">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.clientName} • {event.category}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(event.slug || event.id)}><Share2 className="w-4 h-4 mr-2" /> Share Link</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleLock(event.id, event.isLocked)}>{event.isLocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />} {event.isLocked ? 'Unlock' : 'Lock'}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setGalleryToDelete(event.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-4 mb-6 py-3 border-y border-border/30 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-primary" /> {event.viewCount || 0} Views</span>
                    <span className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-primary" /> {(event.items || []).filter((i: any) => i.isFavorite).length} Favorites</span>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" size="sm" className="flex-1 rounded-full" asChild><Link href={`/gallery/${event.slug || event.id}`}>Preview</Link></Button>
                    <Button size="sm" className="flex-1 rounded-full bg-primary font-bold" asChild><Link href={`/events/${event.id}/manage`}>Manage</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!galleryToDelete} onOpenChange={(open) => !open && setGalleryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
            <AlertDialogDescription>This action is permanent. All associated assets and telemetry will be purged.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
