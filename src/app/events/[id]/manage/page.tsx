"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Share2, 
  MessageCircle, 
  Link as LinkIcon, 
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  Loader2,
  Globe,
  Settings,
  Copy,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'gallery' | null>(null);

  // Local state for settings
  const [settings, setSettings] = useState({
    title: '',
    clientName: '',
    description: ''
  });

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

  useEffect(() => {
    if (event) {
      setSettings({
        title: event.title || '',
        clientName: event.clientName || '',
        description: event.description || ''
      });
    }
  }, [event]);

  const handleUpdateSettings = async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { ...settings, updatedAt: new Date().toISOString() });
      toast({ title: "Settings Saved", description: "Gallery metadata updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { coverImage: imageUrl, updatedAt: new Date().toISOString() });
      toast({ title: "Cover Updated", description: "New gallery cover has been set successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  const confirmDelete = async () => {
    if (!eventRef || deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    setShowDeleteDialog(false);
    try {
      await deleteDoc(eventRef);
      toast({ title: "Event Deleted" });
      router.replace('/dashboard');
    } catch (err: any) {
      setIsDeleting(false);
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  const updateToggle = (field: string, value: any) => {
    if (!eventRef) return;
    const updateData = { [field]: value, updatedAt: new Date().toISOString() };
    
    if (field === 'isPaid' && value === true) {
      updateData.isLocked = false;
    } else if (field === 'isPaid' && value === false) {
      updateData.isLocked = true;
    }

    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ title: "Status Updated" });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink('gallery');
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (authLoading || dataLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!isDeleting && (error || !event)) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <Button className="mt-6" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/gallery/${event.slug || event.id}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-bold tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{event.category}</span>
              <span className="opacity-30">•</span>
              <span>Created {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : '--'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-xl gap-2 font-bold border-border/50 hover:bg-primary/5 hover:text-primary transition-all">
               <Eye className="w-4 h-4" /> Live Preview
             </Button>
          </Link>
          <Link href={`/events/${id}/upload`}>
            <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/20">
              <ImageIcon className="w-4 h-4" /> Add Photos
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Visibility Controls */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Visibility & Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Public Gallery</Label>
                    <p className="text-[10px] text-muted-foreground">Toggle visibility via direct slug.</p>
                  </div>
                  <Switch checked={event.isPublic} onCheckedChange={(val) => updateToggle('isPublic', val)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Client Downloads</Label>
                    <p className="text-[10px] text-muted-foreground">Enable high-res master saving.</p>
                  </div>
                  <Switch checked={!event.isLocked} onCheckedChange={(val) => updateToggle('isLocked', !val)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Messaging Hub */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-green-500/5 border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" /> Message Box
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="p-6 bg-background/50 rounded-2xl border border-border/30 space-y-4">
                <p className="text-sm text-muted-foreground italic leading-relaxed">Notify your client that their memories are ready for viewing. This will open WhatsApp with a pre-filled luxury message.</p>
                <Button 
                  className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold gap-3 text-lg shadow-lg shadow-green-500/20"
                  onClick={() => {
                    const text = encodeURIComponent(`Hi ${event.clientName}! Your beautiful memories from "${event.title}" are ready to view. Check out your luxury gallery here: ${galleryUrl}`);
                    window.open(`https://wa.me/${(event.clientPhone || "").replace(/\D/g, '')}?text=${text}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-5 h-5" /> Send WhatsApp Notification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Asset Management Preview */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-headline font-bold">Delivered Masterpieces</h2>
              <Badge variant="outline" className="px-4 py-1.5 font-bold text-primary border-primary/30 uppercase tracking-widest text-[10px]">
                {event.items?.length || 0} Assets
              </Badge>
            </div>
            
            {(!event.items || event.items.length === 0) ? (
              <div className="text-center py-32 border-2 border-dashed border-border/20 rounded-[3rem] bg-card/10">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground italic font-headline text-xl">No photos have been delivered yet.</p>
                <Link href={`/events/${id}/upload`} className="mt-6 inline-block">
                  <Button variant="outline" className="rounded-xl border-primary/30 text-primary font-bold">Go to Upload Center</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {event.items.map((item: any) => (
                  <div key={item.id} className="group relative aspect-[4/5] rounded-3xl overflow-hidden border border-border/30 bg-muted shadow-lg">
                    <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="Gallery Item" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-[2px]">
                      <Button 
                        size="sm" 
                        className={cn(
                          "w-full rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                          event.coverImage === item.url ? "bg-green-500 text-white cursor-default" : "bg-white text-black hover:bg-gray-100"
                        )}
                        onClick={() => event.coverImage !== item.url && handleSetCover(item.url)}
                      >
                        {event.coverImage === item.url ? <Check className="w-3 h-3 mr-1" /> : null}
                        {event.coverImage === item.url ? "Current Cover" : "Set as Cover"}
                      </Button>
                    </div>
                    {event.coverImage === item.url && (
                      <div className="absolute top-4 left-4 bg-green-500 text-white p-1.5 rounded-full shadow-xl ring-2 ring-white/20">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings & Details */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Gallery Title</Label>
                  <Input value={settings.title} onChange={(e) => setSettings({...settings, title: e.target.value})} className="rounded-xl h-12 bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={settings.clientName} onChange={(e) => setSettings({...settings, clientName: e.target.value})} className="rounded-xl h-12 bg-background/50 border-border/50" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="rounded-xl px-10 h-12 font-bold" onClick={handleUpdateSettings}>Save Metadata</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats & Sharing */}
        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg border-t-4 border-t-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Live Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Assets</p>
                  <p className="text-2xl font-headline font-bold">{event.items?.length || 0}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Views</p>
                  <p className="text-2xl font-headline font-bold">{event.viewCount || '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Sharing Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Gallery URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={galleryUrl} className="h-10 text-[10px] bg-background border-border/50 rounded-xl" />
                  <Button size="icon" variant="outline" className="rounded-xl shrink-0" onClick={() => handleCopy(galleryUrl)}>
                    {copiedLink === 'gallery' ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20 rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-headline font-bold text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full rounded-xl font-bold h-12" onClick={() => setShowDeleteDialog(true)}>
                Delete Gallery
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>Type <span className="text-destructive font-mono font-bold">DELETE</span> to confirm.</p>
              <Input placeholder="Type DELETE..." className="text-center font-bold" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1" onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'}>
              Destroy Gallery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}