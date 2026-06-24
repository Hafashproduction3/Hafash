
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
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useMemo, useEffect } from 'react';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
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

  useEffect(() => {
    if (event) {
      console.log(`MANAGE_DEBUG: Retrieved event: ${event.title}`, {
        itemsCount: event.items?.length,
        itemsSample: event.items?.slice(0, 2)
      });
    }
  }, [event]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading event details...</p>
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

  const handleCopyLink = () => {
    const url = `${window.location.origin}/gallery/${event.slug || event.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Gallery link copied." });
  };

  const handleWhatsAppShare = () => {
    const url = `${window.location.origin}/gallery/${event.slug || event.id}`;
    const text = `Check out your luxury gallery: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = () => {
    if (!firestore || !confirm('Are you sure you want to delete this event?')) return;
    const docRef = doc(firestore, 'galleries', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Event Deleted" });
        router.push('/dashboard');
      })
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      });
  };

  const toggleLock = (status: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'galleries', id);
    const updateData = { isLocked: !status };

    updateDoc(docRef, updateData)
      .catch(async (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      });
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
                <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3" onClick={handleWhatsAppShare}>
                  <MessageCircle className="w-5 h-5" /> Share via WhatsApp
                </Button>
                <Button className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3" onClick={handleCopyLink}>
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
                    {event.isLocked ? "Watermarks are active." : "Original files are ready."}
                  </p>
                </div>
                <Switch 
                  checked={!event.isLocked} 
                  onCheckedChange={() => toggleLock(event.isLocked)} 
                  className="data-[state=checked]:bg-primary"
                />
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
