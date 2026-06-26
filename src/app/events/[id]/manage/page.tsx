
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
  ChevronRight,
  Eye,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  
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

  const favoritesCount = useMemo(() => {
    if (!event || !Array.isArray(event.items)) return 0;
    return event.items.filter((i: any) => i.isFavorite).length;
  }, [event?.items]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Accessing Studio Workflow...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50 max-w-2xl mx-auto">
        <h2 className="text-2xl font-headline font-bold">Event not found</h2>
        <Button className="mt-6 rounded-full px-8 bg-primary text-primary-foreground" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (!firestore || !user || !eventRef || !confirm('Are you sure you want to delete this event? This will permanently remove all associated telemetry.')) return;
    deleteDoc(eventRef)
      .then(() => {
        toast({ title: "Event Purged" });
        router.push('/dashboard');
      });
  };

  const totalItemsCount = Array.isArray(event.items) ? event.items.length : 1;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-primary">Master Telemetry</span>
              <div className="h-1 w-1 bg-primary rounded-full" />
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground">{event.category}</span>
            </div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">{event.title}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-full gap-2 border-primary/30 text-primary hover:bg-primary/10 px-6 font-bold">
               <Eye className="w-4 h-4" /> Preview
             </Button>
          </Link>
          <Button variant="destructive" className="rounded-full gap-2 h-10 px-6 font-bold" onClick={handleDelete}>
             <Trash2 className="w-4 h-4" /> Purge
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] ml-1">Client Preview URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-80 text-primary/80 font-mono flex items-center">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/gallery/{event.slug || event.id}
                  </div>
                  <Button size="icon" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-11" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3 shadow-lg shadow-[#25D366]/10" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out your luxury gallery: ${window.location.origin}/gallery/${event.slug || event.id}`)}`, '_blank')}>
                  <MessageCircle className="w-5 h-5" /> WhatsApp Delivery
                </Button>
                <Button className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-lg shadow-primary/10" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                  <LinkIcon className="w-5 h-5" /> Copy Gallery Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 rounded-3xl p-8 flex items-center justify-between group overflow-hidden relative">
            <div className="relative z-10 flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary fill-current" />
              </div>
              <div>
                <h4 className="text-xl font-headline font-bold">Fulfillment Workflow</h4>
                <p className="text-sm text-muted-foreground italic">Client has favorited {favoritesCount} masterpieces. Manage the selection workflow in the Favorites hub.</p>
              </div>
            </div>
            <Link href="/favorites" className="relative z-10">
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8">
                Manage Selection <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 py-4">
              <CardTitle className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Studio Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link href={`/events/${id}/upload`} className="block">
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/5 hover:text-primary rounded-xl h-12 px-4 group">
                  <span className="flex items-center gap-3 font-bold text-xs"><ImageIcon className="w-4 h-4" /> Add Media</span>
                  <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <div className="pt-4 mt-4 border-t border-border/30 px-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Public Downloads</span>
                    <p className="text-[8px] text-muted-foreground italic mt-0.5">Allow users to grab high-res files</p>
                  </div>
                  <Switch 
                    checked={!event.isLocked} 
                    onCheckedChange={() => updateDoc(eventRef!, { isLocked: !event.isLocked })}
                  />
                </div>
                
                <div className="p-4 bg-muted/20 rounded-xl space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>View Count</span>
                      <span className="text-primary">{event.viewCount || 0}</span>
                   </div>
                   <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Favorites</span>
                      <span className="text-primary">{favoritesCount}</span>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
