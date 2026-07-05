
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
  Eye,
  Loader2,
  ShieldCheck,
  CreditCard,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Heart,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Smartphone,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
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
  const [copiedLink, setCopiedLink] = useState<'gallery' | 'selection' | null>(null);
  
  // Local state for settings to avoid jittery typing
  const [settings, setSettings] = useState({
    title: '',
    clientName: '',
    description: '',
    password: ''
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
        description: event.description || '',
        password: event.password || ''
      });
    }
  }, [event]);

  const photographerRef = useMemo(() => {
    if (!firestore || !event?.userId || !user || user.uid !== event.userId) return null;
    return doc(firestore, 'users', event.userId);
  }, [firestore, event?.userId, user?.uid]);

  const { data: profile } = useDoc(photographerRef);

  const favoritesCount = useMemo(() => {
    if (!event || !Array.isArray(event.items)) return 0;
    return event.items.filter((i: any) => i.isFavorite).length;
  }, [event?.items]);

  const handleUpdateSettings = async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, settings);
      toast({ title: "Settings Saved", description: "Gallery metadata updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  };

  const confirmDelete = async () => {
    if (!eventRef || deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    setShowDeleteDialog(false);
    
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }
    
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
    const updateData = { [field]: value };
    
    // Logic: If marking as paid, also unlock downloads automatically
    if (field === 'isPaid' && value === true) {
      updateData.isLocked = false;
    } else if (field === 'isPaid' && value === false) {
      updateData.isLocked = true;
    }

    updateDoc(eventRef, updateData)
      .then(() => {
        toast({ title: "Status Updated", description: `Setting synchronized successfully.` });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      });
  };

  const handleCopy = (text: string, type: 'gallery' | 'selection') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
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
  const selectionUrl = event.albumLinkToken ? `${origin}/album/${event.albumLinkToken}` : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Premium Header */}
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
        {/* Left Column: Management & Settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Delivery & Security Controls */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Delivery Suite
                  </CardTitle>
                  <CardDescription>Control how your clients interact with their memories.</CardDescription>
                </div>
                <Badge variant="outline" className="text-[8px] tracking-[0.2em] font-bold border-primary/30 text-primary">
                  STUDIO FLOW ACTIVE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        {event.isLocked ? <Lock className="w-3 h-3 text-destructive" /> : <Unlock className="w-3 h-3 text-green-500" />}
                        Allow Downloads
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Clients can save high-res assets.</p>
                    </div>
                    <Switch 
                      checked={!event.isLocked} 
                      onCheckedChange={(val) => updateToggle('isLocked', !val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-primary" />
                        Payment Required
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Downloads lock until marked as paid.</p>
                    </div>
                    <Switch 
                      checked={!!event.isPaid} 
                      onCheckedChange={(val) => updateToggle('isPaid', val)}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary" />
                        Dynamic Watermark
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Protect unpaid preview assets.</p>
                    </div>
                    <Switch checked={true} disabled /> {/* Placeholder as requested */}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Globe className="w-3 h-3 text-primary" />
                        Public Link
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Anyone with link can view.</p>
                    </div>
                    <Switch 
                      checked={!!event.isPublic} 
                      onCheckedChange={(val) => updateToggle('isPublic', val)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Settings */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Gallery Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Gallery / Event Name</Label>
                  <Input 
                    value={settings.title}
                    onChange={(e) => setSettings({...settings, title: e.target.value})}
                    className="rounded-xl border-border/50 h-12 bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input 
                    value={settings.clientName}
                    onChange={(e) => setSettings({...settings, clientName: e.target.value})}
                    className="rounded-xl border-border/50 h-12 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gallery Description</Label>
                <Textarea 
                  value={settings.description}
                  onChange={(e) => setSettings({...settings, description: e.target.value})}
                  placeholder="Tell the story of this event..."
                  className="rounded-xl border-border/50 bg-background/50 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  className="rounded-xl px-8 h-12 font-bold"
                  onClick={handleUpdateSettings}
                >
                  Sync Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Asset Management - Cover Selector */}
          <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" /> Cover Asset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {event.items?.map((item: any) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "aspect-[4/3] relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all",
                      event.coverImage === item.url ? "border-primary ring-2 ring-primary/20" : "border-border/30 hover:border-primary/50"
                    )}
                    onClick={() => updateToggle('coverImage', item.url)}
                  >
                    <img src={item.url} className="w-full h-full object-cover" alt="Asset" />
                    {event.coverImage === item.url && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-primary drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ))}
                {(!event.items || event.items.length === 0) && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-border/20 rounded-[2rem] opacity-40">
                    <p className="text-sm italic">No photos uploaded yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sharing & Statistics */}
        <div className="space-y-8">
          
          {/* Stats Card */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg border-t-4 border-t-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Live Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Assets</p>
                  <p className="text-2xl font-headline font-bold">{event.items?.length || 0}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Gallery Views</p>
                  <p className="text-2xl font-headline font-bold">{event.viewCount || '--'}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Favorites</p>
                  <p className="text-2xl font-headline font-bold text-primary">{favoritesCount}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-2xl border border-border/30 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Downloads</p>
                  <p className="text-2xl font-headline font-bold">--</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sharing Suite */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Sharing Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Public Gallery Link</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={galleryUrl}
                    className="h-10 text-[10px] bg-background border-border/50 rounded-xl"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-xl shrink-0"
                    onClick={() => handleCopy(galleryUrl, 'gallery')}
                  >
                    {copiedLink === 'gallery' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Designer Selection Link</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={selectionUrl || 'Portal not generated'}
                    className="h-10 text-[10px] bg-background border-border/50 rounded-xl italic"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-xl shrink-0"
                    disabled={!selectionUrl}
                    onClick={() => handleCopy(selectionUrl, 'selection')}
                  >
                    {copiedLink === 'selection' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {!selectionUrl && (
                  <p className="text-[8px] text-primary font-bold uppercase italic">Generate in Workflow Portal to enable sharing.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" className="rounded-xl gap-2 text-[10px] font-bold h-12 border-border/50">
                  <QrCode className="w-4 h-4" /> QR Code
                </Button>
                <Button variant="outline" className="rounded-xl gap-2 text-[10px] font-bold h-12 border-border/50">
                  <Smartphone className="w-4 h-4" /> Device Sync
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-destructive/5 border-destructive/20 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-headline font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </CardTitle>
              <CardDescription className="text-[10px]">Irreversible actions for this gallery.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                className="w-full rounded-xl font-bold h-12 shadow-lg shadow-destructive/20"
                onClick={() => setShowDeleteDialog(true)}
              >
                Permanently Delete Gallery
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-destructive/10 p-4 rounded-full">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Critical Security Check</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>You are about to permanently delete <strong>{event.title}</strong>. This action will remove all assets, links, and client selections.</p>
              <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Confirm Deletion</p>
                <p className="text-xs">Type <span className="text-destructive font-mono font-bold">DELETE</span> in the field below to proceed.</p>
                <Input 
                  placeholder="Type DELETE here..." 
                  className="bg-background border-border/50 text-center font-bold"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl flex-1 mt-0">Cancel Session</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1" 
              onClick={confirmDelete}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Destroy Gallery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

