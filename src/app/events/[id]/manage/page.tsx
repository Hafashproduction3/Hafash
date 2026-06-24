"use client";

import { useFirestore, useDoc } from '@/firebase';
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
  ChevronRight,
  Eye,
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useMemo } from 'react';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading, error } = useDoc(eventRef);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-destructive/5 rounded-3xl border border-destructive/20 max-w-2xl mx-auto">
        <p className="text-destructive font-bold text-lg">Error loading event</p>
        <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        <Button variant="outline" className="mt-6 rounded-full" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50 max-w-2xl mx-auto">
        <h2 className="text-2xl font-headline font-bold">Event not found</h2>
        <p className="text-muted-foreground mt-2">The event you're looking for doesn't exist or you don't have access.</p>
        <Button className="mt-6 rounded-full px-8 bg-primary text-primary-foreground" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/gallery/${event.slug || event.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard." });
  };

  const handleWhatsAppShare = () => {
    const url = `${window.location.origin}/gallery/${event.slug || event.id}`;
    const text = `Check out your luxury gallery: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = async () => {
    if (!firestore || !confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(firestore, 'galleries', id));
      toast({ title: "Event Deleted", description: "The gallery has been removed." });
      router.push('/dashboard');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const toggleLock = async (status: boolean) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'galleries', id), { isLocked: !status });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">{event.title}</h1>
            <p className="text-muted-foreground">Manage gallery access and delivery.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-full gap-2 border-primary text-primary hover:bg-primary/10">
               <Eye className="w-4 h-4" /> Public Preview
             </Button>
          </Link>
          <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete}>
             <Trash2 className="w-4 h-4" /> Delete Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Delivery Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Public Gallery Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-80 text-primary/80 font-mono">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/gallery/{event.slug || event.id}
                  </div>
                  <Button size="icon" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCopyLink}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3 shadow-lg shadow-green-500/10" onClick={handleWhatsAppShare}>
                  <MessageCircle className="w-5 h-5" /> Share via WhatsApp
                </Button>
                <Button className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-lg shadow-primary/10" onClick={handleCopyLink}>
                  <LinkIcon className="w-5 h-5" /> Copy Gallery Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Access Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center justify-between p-6 bg-background rounded-2xl border border-border/30">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    {event.isLocked ? <Lock className="w-4 h-4 text-destructive" /> : <Unlock className="w-4 h-4 text-green-500" />}
                    Client Downloads
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {event.isLocked 
                      ? "Watermarks are active. Clients cannot download original files." 
                      : "Watermarks are hidden. Original files are ready for download."}
                  </p>
                </div>
                <Switch 
                  checked={!event.isLocked} 
                  onCheckedChange={() => toggleLock(event.isLocked)} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Items</p>
                   <p className="text-2xl font-headline font-bold">{event.items?.length || 0}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Views</p>
                   <p className="text-2xl font-headline font-bold">{event.viewCount || 0}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Favorites</p>
                   <p className="text-2xl font-headline font-bold text-primary">{event.items?.filter((i: any) => i.isFavorite).length || 0}</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link href={`/events/${id}/upload`} className="block">
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary rounded-xl h-12">
                  <span className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /> Add More Media</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary rounded-xl h-12">
                <span className="flex items-center gap-3"><SettingsIcon className="w-4 h-4" /> Gallery Settings</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Cover Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative aspect-video">
                <img src={event.coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-4">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                  Change Cover Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
