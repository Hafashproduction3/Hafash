
"use client";

import { useFirestore, useAuth, useCollection } from '@/firebase';
import { 
  Users, 
  Image as ImageIcon, 
  Eye, 
  Plus, 
  MoreVertical, 
  Share2, 
  Trash2, 
  Lock, 
  Unlock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const galleriesQuery = useMemo(() => {
    if (!firestore || !auth?.currentUser) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', auth.currentUser.uid));
  }, [firestore, auth?.currentUser?.uid]);

  const { data: galleries, loading } = useCollection(galleriesQuery);

  const handleShare = (slug: string) => {
    const url = `${window.location.origin}/gallery/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Gallery link has been copied to clipboard.",
    });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this gallery?")) return;
    try {
      await deleteDoc(doc(firestore, 'galleries', id));
      toast({ title: "Deleted", description: "Gallery has been removed." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const toggleLock = async (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'galleries', id), { isLocked: !currentStatus });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your studio...</p>
      </div>
    );
  }

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Galleries" value={galleries?.length.toString() || "0"} icon={<ImageIcon className="w-5 h-5 text-primary" />} />
        <StatCard title="Total Clients" value={galleries?.length.toString() || "0"} icon={<Users className="w-5 h-5 text-primary" />} />
        <StatCard title="Gallery Views" value={galleries?.reduce((acc, curr) => acc + (curr.viewCount || 0), 0).toString() || "0"} icon={<Eye className="w-5 h-5 text-primary" />} />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-headline font-bold border-b border-border/50 pb-4">Recent Events</h2>
        
        {galleries?.length === 0 ? (
          <div className="py-20 text-center bg-card/30 rounded-3xl border border-dashed border-border/50">
            <p className="text-muted-foreground italic">You haven't created any events yet.</p>
            <Link href="/events/create">
              <Button variant="link" className="text-primary mt-2">Create your first gallery</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {galleries?.map((event) => (
              <Card key={event.id} className="overflow-hidden border-border/30 bg-card/50 group hover:border-primary/50 transition-all duration-300">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img 
                    src={event.coverImage} 
                    alt={event.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 ${event.isLocked ? 'bg-destructive/20 text-destructive-foreground border border-destructive/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                      {event.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {event.isLocked ? 'Downloads Locked' : 'Downloads Open'}
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
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
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-3xl font-headline font-bold mt-1">{value}</h3>
      </div>
      <div className="p-3 bg-primary/10 rounded-2xl">
        {icon}
      </div>
    </Card>
  );
}
