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
  Heart,
  CreditCard
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

  const photographerRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc(photographerRef);

  const favoritesCount = useMemo(() => {
    if (!event || !Array.isArray(event.items)) return 0;
    return event.items.filter((i: any) => i.isFavorite).length;
  }, [event?.items]);

  if (authLoading || dataLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (error || !event) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <Button className="mt-6" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    deleteDoc(eventRef!).then(() => {
      toast({ title: "Event Deleted" });
      router.push('/dashboard');
    });
  };

  const handleWhatsAppDelivery = () => {
    if (!profile?.whatsappNumber) return;
    const cleanedNumber = profile.whatsappNumber.replace(/\D/g, '');
    const message = `Check out your luxury gallery: ${window.location.origin}/gallery/${event.slug || event.id}`;
    window.open(`https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">{event.title}</h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-full gap-2">
               <Eye className="w-4 h-4" /> Preview
             </Button>
          </Link>
          <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete}>
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
                    {window.location.origin}/gallery/{event.slug || event.id}
                  </div>
                  <Button size="icon" className="rounded-xl" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile?.whatsappNumber && (
                  <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3" onClick={handleWhatsAppDelivery}>
                    <MessageCircle className="w-5 h-5" /> WhatsApp Delivery
                  </Button>
                )}
                <Button className="h-14 rounded-2xl bg-primary font-bold gap-3" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                  <LinkIcon className="w-5 h-5" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 rounded-3xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h4 className="text-xl font-headline font-bold">Payment Status</h4>
                <p className="text-sm text-muted-foreground">Downloads are {event.isPaid ? 'unlocked' : 'restricted'}.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase">Payment Received</span>
              <Switch 
                checked={!!event.isPaid} 
                onCheckedChange={(checked) => updateDoc(eventRef!, { isPaid: checked })}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 py-4">
              <CardTitle className="text-[10px] uppercase tracking-widest text-primary font-bold">Event Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Masterpieces</span>
                <span className="font-bold">{event.items?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Favorites</span>
                <span className="font-bold">{favoritesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Views</span>
                <span className="font-bold">{event.viewCount || 0}</span>
              </div>
              <Separator className="my-2" />
              <Link href={`/events/${id}/upload`}>
                <Button className="w-full rounded-xl gap-2">
                  <ImageIcon className="w-4 h-4" /> Add Photos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
