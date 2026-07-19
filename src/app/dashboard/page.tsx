"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Trash2, 
  ExternalLink, 
  MoreVertical, 
  Camera, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Heart, 
  ShieldCheck, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { deleteGalleryFiles } from '@/app/actions/storage';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [galleryToDelete, setGalleryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch User Profile for stats
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch User Galleries
  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const filteredGalleries = useMemo(() => {
    if (!galleries) return [];
    return galleries.filter(g => 
      g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [galleries, searchQuery]);

  const stats = useMemo(() => {
    if (!galleries) return { totalDeliveries: 0, totalPhotos: 0, totalFavorites: 0 };
    return {
      totalDeliveries: galleries.length,
      totalPhotos: galleries.reduce((acc, g) => acc + (g.items?.length || 0), 0),
      totalFavorites: galleries.reduce((acc, g) => acc + (g.items?.filter((i: any) => i.isFavorite).length || 0), 0)
    };
  }, [galleries]);

  const confirmDelete = useCallback(async () => {
    if (!firestore || !user || !galleryToDelete || !galleries) return;

    const idToDelete = galleryToDelete;
    const targetGallery = galleries.find(g => g.id === idToDelete);

    // Close modal immediately to prevent DOM race conditions during async purge
    setGalleryToDelete(null);
    setIsDeleting(true);

    try {
      // 1. Purge binary assets from Cloudflare R2 first
      const storageKeys = (targetGallery?.items || [])
        .map((item: any) => item.storageKey)
        .filter(Boolean);

      if (storageKeys.length > 0) {
        const storageResult = await deleteGalleryFiles(storageKeys, idToDelete);
        if (!storageResult.success) {
          throw new Error(storageResult.error || "Failed to purge physical storage.");
        }
      }

      // 2. Delete Firestore document
      await deleteDoc(doc(firestore, "galleries", idToDelete));

      toast({
        title: "Gallery Purged",
        description: "Studio records and cloud assets removed successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: err.message || "An unexpected error occurred during the purge.",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [firestore, user, galleryToDelete, galleries, toast]);

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tight">Studio Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your luxury visual deliveries.</p>
        </div>
        <Link href="/events/create">
          <Button className="rounded-full h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-xl shadow-primary/20">
            <Plus className="w-5 h-5" /> Create Luxury Event
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Deliveries" value={stats.totalDeliveries} icon={<Camera className="w-5 h-5" />} loading={dataLoading} />
        <StatCard label="Cloud Assets" value={stats.totalPhotos} icon={<LayoutGrid className="w-5 h-5" />} loading={dataLoading} />
        <StatCard label="Client Favorites" value={stats.totalFavorites} icon={<Heart className="w-5 h-5" />} loading={dataLoading} />
      </div>

      {/* Controls */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-2xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search galleries or clients..." 
            className="pl-10 h-11 bg-background/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="flex bg-background/50 p-1 rounded-xl border border-border/50">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-lg" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-lg" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Galleries List */}
      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-3xl" />)}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[3rem] bg-card/10">
          <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
          <h3 className="text-xl font-headline font-bold">No galleries found</h3>
          <p className="text-muted-foreground mt-2 italic">Start by creating your first luxury event.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGalleries.map(gallery => (
            <Card key={gallery.id} className="group overflow-hidden rounded-[2rem] border-border/50 bg-card/40 backdrop-blur-sm hover:border-primary/40 transition-all duration-500 shadow-xl">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img src={gallery.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={gallery.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem onClick={() => router.push(`/events/${gallery.id}/manage`)}>
                        Manage Gallery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/events/${gallery.id}/upload`)}>
                        Add Assets
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/gallery/${gallery.slug || gallery.id}`, '_blank')}>
                        Open Public View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive font-bold" onClick={() => setGalleryToDelete(gallery.id)}>
                        Delete Record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="bg-primary/20 text-primary border-primary/30 mb-3 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">{gallery.category}</Badge>
                  <h3 className="text-2xl font-headline font-bold text-white tracking-tight line-clamp-1">{gallery.title}</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="flex items-center gap-2"><UserIcon className="w-3.5 h-3.5 text-primary" /> {gallery.clientName}</span>
                  <span className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 text-primary" /> {gallery.date}</span>
                </div>
                <div className="pt-4 border-t border-border/20 flex justify-between items-center">
                   <span className="text-[10px] font-bold text-primary">{gallery.items?.length || 0} Assets Delivered</span>
                   <Link href={`/events/${gallery.id}/manage`}>
                     <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-2 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary">
                       Manage <ArrowRight className="w-3 h-3" />
                     </Button>
                   </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGalleries.map(gallery => (
            <div key={gallery.id} className="flex items-center gap-6 p-4 bg-card/40 border border-border/50 rounded-2xl group hover:border-primary/40 transition-all">
              <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-border/30">
                <img src={gallery.coverImage} className="w-full h-full object-cover" alt="Cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{gallery.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5"><UserIcon className="w-3 h-3" /> {gallery.clientName}</span>
                  <span className="flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> {gallery.date}</span>
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3">
                 <Badge variant="outline" className="text-[9px] uppercase font-bold px-3 py-1 border-primary/20 text-primary">{gallery.category}</Badge>
                 <span className="text-[10px] font-bold text-muted-foreground px-4 border-l border-border/50">{gallery.items?.length || 0} Assets</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/events/${gallery.id}/manage`}>
                  <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl font-bold">Manage</Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => setGalleryToDelete(gallery.id)}>
                   <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!galleryToDelete} onOpenChange={(open) => !open && setGalleryToDelete(null)}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] p-10 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Permanent Purge</AlertDialogTitle>
            <AlertDialogDescription className="text-center italic mt-2">
              This will immediately revoke client access and permanently destroy all high-resolution masterpieces in the cloud vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-4 mt-8">
            <AlertDialogCancel className="rounded-xl h-12 flex-1 font-bold">Abort</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl h-12 flex-1 bg-destructive text-white hover:bg-destructive/90 font-bold" onClick={confirmDelete}>
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Deleting Overlay */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
           <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
           <p className="text-xl font-headline font-bold italic text-primary">Purging Studio Assets...</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, loading }: { label: string, value: number, icon: React.ReactNode, loading: boolean }) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-3xl luxury-card-hover">
      <CardContent className="p-8 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-10 w-16" /> : <h3 className="text-4xl font-headline font-bold text-primary">{value}</h3>}
        </div>
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
