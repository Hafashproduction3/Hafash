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
  AlertTriangle,
  ArrowRight
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
import { cn } from '@/lib/utils';

const StatCard = memo(({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading?: boolean }) => (
  <Card className="bg-card/40 backdrop-blur-md border-border/30 p-6 flex items-center justify-between luxury-card-hover group">
    <div>
      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-1">{title}</p>
      {loading ? (
        <Skeleton className="h-10 w-16 mt-1 rounded-lg" />
      ) : (
        <h3 className="text-3xl font-headline font-bold mt-1 text-primary group-hover:scale-105 transition-transform duration-500 origin-left">{value}</h3>
      )}
    </div>
    <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors duration-500">
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/20 pb-10">
        <div>
          <h1 className="text-5xl font-headline font-bold">Studio Overview</h1>
          <p className="text-muted-foreground mt-3 italic text-lg max-w-lg">Orchestrate your luxury galleries and maintain client excellence.</p>
        </div>
        <Link href="/events/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-14 font-bold flex gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-5 h-5" />
            Launch New Event
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Total Galleries" value={stats.count} loading={dataLoading && !galleries} icon={<ImageIcon className="w-6 h-6 text-primary" />} />
        <StatCard title="Client Registry" value={stats.count} loading={dataLoading && !galleries} icon={<Users className="w-6 h-6 text-primary" />} />
        <StatCard title="Engagement views" value={stats.views} loading={dataLoading && !galleries} icon={<Eye className="w-6 h-6 text-primary" />} />
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/20 pb-4">
          <h2 className="text-3xl font-headline font-bold">Recent Deliveries</h2>
          <Link href="/clients" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-2">
            View All Clients <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {dataLoading && !galleries ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Skeleton className="h-[450px] rounded-[2.5rem]" />
            <Skeleton className="h-[450px] rounded-[2.5rem]" />
          </div>
        ) : !galleries || galleries.length === 0 ? (
          <Card className="py-32 text-center bg-card/20 rounded-[3rem] border border-dashed border-border/50">
            <CardContent>
              <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-10 h-10 text-primary opacity-20" />
              </div>
              <h3 className="text-xl font-headline font-bold mb-2">No active galleries</h3>
              <p className="text-muted-foreground max-w-sm mx-auto italic mb-8">Begin your delivery workflow by creating your first luxury event.</p>
              <Link href="/events/create">
                <Button variant="outline" className="rounded-full px-8 h-12 border-primary/30 text-primary hover:bg-primary/10">Create Event</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {galleries.map((event) => (
              <Card key={event.id} className="overflow-hidden border-border/30 bg-card/40 backdrop-blur-md rounded-[2.5rem] luxury-card-hover group">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-6 right-6">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl flex items-center gap-2 border shadow-lg",
                      event.isLocked ? 'bg-destructive/20 text-destructive-foreground border-destructive/30' : 'bg-green-500/20 text-green-400 border-green-500/30'
                    )}>
                      {event.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {event.isLocked ? 'Protected' : 'Accessible'}
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md px-3 py-0.5 text-[9px] uppercase font-bold tracking-tighter">
                      {event.category}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-headline font-bold group-hover:text-primary transition-colors">{event.title}</h3>
                      <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                        <Users className="w-3 h-3" /> {event.clientName}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary"><MoreVertical className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border/50 rounded-2xl p-2 shadow-2xl">
                        <DropdownMenuItem className="rounded-xl cursor-pointer" onClick={() => handleShare(event.slug || event.id)}><Share2 className="w-4 h-4 mr-3 text-primary" /> Copy Link</DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl cursor-pointer" onClick={() => toggleLock(event.id, event.isLocked)}>{event.isLocked ? <Unlock className="w-4 h-4 mr-3 text-primary" /> : <Lock className="w-4 h-4 mr-3 text-primary" />} {event.isLocked ? 'Unlock Asset' : 'Lock Asset'}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive rounded-xl cursor-pointer hover:bg-destructive/10" onClick={() => setGalleryToDelete(event.id)}><Trash2 className="w-4 h-4 mr-3" /> Delete Record</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-8 mb-8 py-4 border-y border-border/20 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
                    <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Eye className="w-4 h-4" /> {event.viewCount || 0} Telemetry Views</span>
                    <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Heart className="w-4 h-4" /> {(event.items || []).filter((i: any) => i.isFavorite).length} Selection favorites</span>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" size="lg" className="flex-1 rounded-2xl h-12 border-border/50 font-bold uppercase tracking-widest text-[10px] hover:bg-primary/5 hover:text-primary hover:border-primary/30" asChild>
                      <Link href={`/gallery/${event.slug || event.id}`}>Preview Gallery</Link>
                    </Button>
                    <Button size="lg" className="flex-1 rounded-2xl h-12 bg-primary font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10" asChild>
                      <Link href={`/events/${event.id}/manage`}>Manage Workspace</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!galleryToDelete} onOpenChange={(open) => !open && setGalleryToDelete(null)}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] shadow-2xl p-10">
          <AlertDialogHeader>
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Permanent Asset Removal?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground italic mt-2">
              This action is irreversible. All high-resolution masters, previews, and engagement telemetry for this event will be permanently purged from the studio vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel className="rounded-xl flex-1 h-12 font-bold uppercase text-[10px] tracking-widest">Abort Action</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl flex-1 h-12 font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20" onClick={confirmDelete}>Destroy Record</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}