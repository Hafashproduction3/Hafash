"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Share2 as Share2Icon, 
  Trash2 as Trash2Icon, 
  Image as ImageIcon,
  ArrowLeft as ArrowLeftIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Loader2 as Loader2Icon,
  Globe as GlobeIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Check as CheckIcon,
  FileText as FileTextIcon,
  MessageSquare as MessageSquareIcon,
  History as HistoryIcon,
  Sparkles as SparklesIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  KeyRound as KeyRoundIcon,
  X as XIcon,
  Camera as CameraIcon,
  Copy as CopyIcon,
  LayoutGrid as LayoutGridIcon,
  ShieldAlert as ShieldAlertIcon,
  AlertCircle as AlertCircleIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Archive as ArchiveIcon,
  ExternalLink as ExternalLinkIcon,
  ShieldCheck as ShieldCheckIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { deleteGalleryFiles } from '@/app/actions/storage';

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
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  const [settings, setSettings] = useState({
    title: '',
    clientName: '',
    description: '',
    photographerNote: '',
    welcomeTitle: '',
    welcomeMessage: '',
    welcomeScreenEnabled: false,
    clientRepliesEnabled: true,
    helpfulButtonEnabled: true,
    albumStatus: 'New Selection',
    isPasswordProtected: false
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
        photographerNote: event.photographerNote || '',
        welcomeTitle: event.welcomeTitle || '',
        welcomeMessage: event.welcomeMessage || '',
        welcomeScreenEnabled: !!event.welcomeScreenEnabled,
        clientRepliesEnabled: event.clientRepliesEnabled !== false,
        helpfulButtonEnabled: event.helpfulButtonEnabled !== false,
        albumStatus: event.albumStatus || 'New Selection',
        isPasswordProtected: !!event.isPasswordProtected
      });
    }
  }, [event]);

  const handleUpdateSettings = useCallback(async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { ...settings, updatedAt: new Date().toISOString() });
      toast({ title: "Settings Saved", description: "Gallery metadata updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  }, [eventRef, settings, toast]);

  const handleSetCover = useCallback(async (imageUrl: string) => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { coverImage: imageUrl, updatedAt: new Date().toISOString() });
      toast({ title: "Cover Updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  }, [eventRef, toast]);

  const handleDeletePhoto = useCallback(async (item: any) => {
    if (!eventRef || !event || !item.storageKey) return;
    
    console.log(`[DEBUG] Image delete start: ${item.id}`);

    setProcessingItems(prev => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      const storageResult = await deleteGalleryFiles([item.storageKey], id);
      if (!storageResult.success) {
        throw new Error(storageResult.error || "Failed to purge storage asset.");
      }

      const updatedItems = (event.items || []).filter((i: any) => i.id !== item.id);
      const updateData: any = { 
        items: updatedItems,
        updatedAt: new Date().toISOString() 
      };
      
      if (event.coverImage === item.url) {
        updateData.coverImage = updatedItems.length > 0 ? updatedItems[0].url : `https://picsum.photos/seed/${id}/800/600`;
      }

      await updateDoc(eventRef, updateData);
      console.log(`[DEBUG] Firestore update response: Metadata updated.`);
      toast({ title: "Asset Purged", description: "Storage usage updated." });
      
    } catch (err: any) {
      console.error("[DEBUG] Deletion sequence failure:", err);
      toast({ variant: "destructive", title: "Deletion Error", description: err.message });
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [eventRef, event, id, toast]);

  const confirmDelete = useCallback(async () => {
    if (!eventRef || deleteConfirmText !== 'DELETE' || !event) return;
    
    console.log(`[DEBUG] Gallery purge start: ${id}`);
    setShowDeleteDialog(false);
    setIsDeleting(true);

    try {
      const storageKeys = (event.items || [])
        .map((item: any) => item.storageKey)
        .filter(Boolean);

      if (storageKeys.length > 0) {
        await deleteGalleryFiles(storageKeys, id);
      }

      await deleteDoc(eventRef);
      console.log(`[DEBUG] Firestore response: Gallery record deleted.`);
      toast({ title: "Gallery Purged" });
      router.replace('/dashboard');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: err.message });
    } finally {
      setIsDeleting(false);
    }
  }, [eventRef, deleteConfirmText, event, router, toast, id]);

  const updateToggle = useCallback((field: string, value: any) => {
    if (!eventRef) return;
    const updateData: any = { [field]: value, updatedAt: new Date().toISOString() };
    if (field === 'isPaid') {
      updateData.isLocked = !value;
    }
    updateDoc(eventRef, updateData).then(() => toast({ title: "Status Updated" }));
  }, [eventRef, toast]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (authLoading || dataLoading || isDeleting) return (
    <HafashLoader text={isDeleting ? "Purging Studio Assets..." : "Preparing Gallery Workspace..."} />
  );

  if (error || !event) return (
    <div className="text-center py-20 bg-card border border-border/50 rounded-[2.5rem]">
      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <Button className="mt-6 rounded-xl px-8" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/gallery/${event.slug || event.id}`;
  const favoritesCount = Array.isArray(event.items) ? event.items.filter((i: any) => i.isFavorite).length : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="relative rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-primary/5 z-0" />
        <div className="relative z-10 p-10 lg:p-14 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 transition-all" onClick={() => router.push('/dashboard')}>
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-[0.3em] px-4 py-1">
                Studio Workspace / {event.category}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl lg:text-6xl font-headline font-bold tracking-tight">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="flex items-center gap-2.5"><UserIcon className="w-4 h-4 text-primary" /> {event.clientName}</span>
                <span className="flex items-center gap-2.5"><CalendarIcon className="w-4 h-4 text-primary" /> {event.date}</span>
                <span className="flex items-center gap-2.5 text-primary/80"><LayoutGridIcon className="w-4 h-4" /> {event.items?.length || 0} Delivered Assets</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link href={`/gallery/${event.slug || event.id}`} target="_blank" className="flex-1">
               <Button className="w-full rounded-2xl h-16 bg-white text-black hover:bg-gray-100 font-bold gap-3 shadow-2xl transition-all hover:scale-105">
                 <EyeIcon className="w-6 h-6" /> Preview
               </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-16 border-border/50 font-bold gap-3 bg-card/40 backdrop-blur-md"
              onClick={() => handleCopy(galleryUrl)}
            >
              {copiedLink ? <CheckIcon className="w-6 h-6 text-green-500" /> : <CopyIcon className="w-6 h-6" />}
              {copiedLink ? "Link Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-10 py-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                  <ImageIcon className="w-8 h-8 text-primary" /> Visual Assets
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-1">Manage delivered high-resolution masterpieces.</CardDescription>
              </div>
              <Link href={`/events/${id}/upload`}>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-xl h-12 px-6">
                  <ImageIcon className="w-5 h-5" /> Add Assets
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-10">
              {(!event.items || event.items.length === 0) ? (
                <div className="text-center py-24 border-2 border-dashed border-border/20 rounded-[2rem]">
                  <LayoutGridIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                  <p className="text-muted-foreground italic font-headline text-xl">No photos delivered yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                  {event.items.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="group relative aspect-[4/5] rounded-[1.5rem] overflow-hidden border border-border/30 bg-muted">
                      <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" alt="Asset" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className={cn(
                            "w-full rounded-xl font-bold text-[10px] uppercase tracking-widest h-10",
                            event.coverImage === item.url ? "bg-green-500 text-white" : "bg-white text-black"
                          )}
                          onClick={() => event.coverImage !== item.url && handleSetCover(item.url)}
                          disabled={processingItems.has(item.id)}
                        >
                          {event.coverImage === item.url ? "Cover" : "Set Cover"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="w-full rounded-xl font-bold text-[10px] uppercase h-10"
                          onClick={() => handleDeletePhoto(item)}
                          disabled={processingItems.has(item.id)}
                        >
                          {processingItems.has(item.id) ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <Trash2Icon className="w-4 h-4 mr-2" />}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {event.items.length > 12 && (
                    <div className="aspect-[4/5] rounded-[1.5rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-muted/20">
                      <span className="text-3xl font-headline font-bold text-primary">{event.items.length - 12}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">More Assets</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                <SparklesIcon className="w-8 h-8 text-primary" /> Experience Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              <div className="space-y-6">
                <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                  <FileTextIcon className="w-5 h-5" /> Welcome Note
                </Label>
                <Textarea 
                  placeholder="Compose a beautiful personalized note..." 
                  className="min-h-[160px] rounded-[2rem] bg-background/50 border-border/50 p-8 text-lg italic focus:border-primary/50"
                  value={settings.photographerNote}
                  onChange={(e) => setSettings({...settings, photographerNote: e.target.value})}
                />
              </div>
              <div className="flex justify-end">
                <Button className="rounded-xl px-14 h-14 font-bold shadow-2xl" onClick={handleUpdateSettings}>
                  Save Client Experience
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-10">
          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-primary">
            <CardHeader className="p-8 border-b border-border/30 bg-background/20">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">Live Asset Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-background/80 p-6 rounded-[1.5rem] border border-border/30 text-center space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Views</p>
                  <p className="text-4xl font-headline font-bold text-primary">{event.viewCount || 0}</p>
                </div>
                <div className="bg-background/80 p-6 rounded-[1.5rem] border border-border/30 text-center space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hearts</p>
                  <p className="text-4xl font-headline font-bold text-primary">{favoritesCount}</p>
                </div>
              </div>
              
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between p-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Public Access</span>
                  <Switch checked={event.isPublic} onCheckedChange={(val) => updateToggle('isPublic', val)} />
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Downloads</span>
                  <Switch checked={!event.isLocked} onCheckedChange={(val) => updateToggle('isLocked', !val)} />
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-border/20">
                   <div className="space-y-1">
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] block">Revenue</span>
                     <span className={cn("text-[10px] font-bold uppercase", event.isPaid ? "text-green-500" : "text-amber-500")}>
                        {event.isPaid ? "Paid" : "Awaiting"}
                     </span>
                   </div>
                  <Switch checked={event.isPaid} onCheckedChange={(val) => updateToggle('isPaid', val)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-primary">
            <CardHeader className="p-8 border-b border-border/30 bg-background/20">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-3">
                <ArchiveIcon className="w-5 h-5 text-primary" /> Album Production
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Workflow Phase</Label>
                  <Select 
                    value={settings.albumStatus} 
                    onValueChange={(val) => {
                      setSettings({...settings, albumStatus: val});
                      if (eventRef) updateDoc(eventRef, { albumStatus: val });
                      toast({ title: "Workflow Updated" });
                    }}
                  >
                    <SelectTrigger className="w-full h-14 rounded-xl bg-background/50 border-border/50 font-bold text-[11px] uppercase tracking-widest">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Selection">New Selection</SelectItem>
                      <SelectItem value="Album Package Generated">Package Ready</SelectItem>
                      <SelectItem value="Shared with Album Designer">In Production</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </CardContent>
            <div className="p-8 pt-0">
               <Link href="/album-selections">
                  <Button variant="link" className="w-full text-[11px] font-bold uppercase text-primary gap-3">
                    Open Workflow Portal <ExternalLinkIcon className="w-4 h-4" />
                  </Button>
               </Link>
            </div>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-base font-headline font-bold text-destructive flex items-center gap-3">
                <Trash2Icon className="w-5 h-5" /> Permanent Purge
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <Button variant="destructive" className="w-full rounded-xl font-bold h-12 text-[10px] uppercase tracking-[0.3em]" onClick={() => setShowDeleteDialog(true)}>
                Delete Gallery Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md p-10 shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircleIcon className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-6 pt-4">
              <p className="text-sm font-medium italic">Type DELETE below to purge all cloud assets.</p>
              <Input placeholder="Type DELETE..." className="text-center font-bold h-14 rounded-xl border-destructive/30" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-4 mt-10">
            <AlertDialogCancel className="rounded-xl flex-1 h-14 font-bold uppercase text-[10px]">Abort</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-white hover:bg-destructive/90 font-bold flex-1 h-14 uppercase text-[10px]" onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'}>
              Destroy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
