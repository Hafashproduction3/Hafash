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
import { format } from 'date-fns';
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
  
  // Per-item processing state to avoid full page freeze
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  // Security State
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Local state for settings
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
      toast({ title: "Settings Saved", description: "Gallery metadata and experience settings updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  }, [eventRef, settings, toast]);

  const hashPassword = useCallback(async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const handleSaveSecurity = useCallback(async () => {
    if (!eventRef) return;
    setIsSecurityLoading(true);
    try {
      const updateData: any = { 
        isPasswordProtected: settings.isPasswordProtected,
        updatedAt: new Date().toISOString() 
      };

      if (settings.isPasswordProtected && newPassword) {
        updateData.hashedPassword = await hashPassword(newPassword);
      } else if (!settings.isPasswordProtected) {
        updateData.hashedPassword = null;
      }

      await updateDoc(eventRef, updateData);
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: "Security Updated", description: "Gallery access controls have been synchronized." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Security Failed", description: err.message });
    } finally {
      setIsSecurityLoading(false);
    }
  }, [eventRef, settings.isPasswordProtected, newPassword, hashPassword, toast]);

  const handleGeneratePassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast({ title: "Password Generated", description: "A secure random password has been created." });
  }, [toast]);

  const handleCopyPassword = useCallback(() => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    toast({ title: "Password Copied", description: "Password copied to clipboard." });
  }, [newPassword, toast]);

  const handleSetCover = useCallback(async (imageUrl: string) => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { coverImage: imageUrl, updatedAt: new Date().toISOString() });
      toast({ title: "Cover Updated", description: "New gallery cover has been set successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  }, [eventRef, toast]);

  const handleDeletePhoto = useCallback(async (item: any) => {
    if (!eventRef || !event || !item.storageKey) return;
    
    // Prevent UI glitches by marking as processing
    setProcessingItems(prev => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      // 1. Physically delete from R2 bucket first to reclaim space
      const storageResult = await deleteGalleryFiles([item.storageKey], id);
      if (!storageResult.success) {
        throw new Error(storageResult.error || "Failed to purge physical cloud asset.");
      }

      // 2. Update Firestore document only after storage confirms deletion
      const updatedItems = (event.items || []).filter((i: any) => i.id !== item.id);
      const updateData: any = { 
        items: updatedItems,
        updatedAt: new Date().toISOString() 
      };
      
      // If we are deleting the current cover, fallback to the next image or generic placeholder
      if (event.coverImage === item.url) {
        updateData.coverImage = updatedItems.length > 0 ? updatedItems[0].url : `https://picsum.photos/seed/${id}/800/600`;
      }

      await updateDoc(eventRef, updateData);
      toast({ title: "Asset Purged", description: "Storage recovered and gallery index updated." });
      
    } catch (err: any) {
      console.error("[DELETE_FAILURE]", err);
      toast({ 
        variant: "destructive", 
        title: "Deletion Error", 
        description: err.message || "Failed to sync deletion with cloud storage." 
      });
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
    
    setShowDeleteDialog(false);
    setIsDeleting(true);

    try {
      // 1. Collect all R2 keys for mass purge
      const storageKeys = (event.items || [])
        .map((item: any) => item.storageKey)
        .filter(Boolean);

      // 2. Perform bulk deletion from storage
      if (storageKeys.length > 0) {
        const storageResult = await deleteGalleryFiles(storageKeys, id);
        if (!storageResult.success) {
          throw new Error(storageResult.error || "Failed to purge assets from storage.");
        }
      }

      // 3. Delete metadata
      await deleteDoc(eventRef);
      
      toast({ 
        title: "Gallery Purged", 
        description: "The gallery and all associated assets have been permanently removed." 
      });

      router.replace('/dashboard');
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Purge Failed", 
        description: err.message || "An unexpected error occurred." 
      });
    } finally {
      setIsDeleting(false);
    }
  }, [eventRef, deleteConfirmText, event, router, toast, id]);

  const updateToggle = useCallback((field: string, value: any) => {
    if (!eventRef) return;
    const updateData: any = { [field]: value, updatedAt: new Date().toISOString() };
    
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
  }, [eventRef, toast]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  }, [toast]);

  const passwordMismatch = useMemo(() => settings.isPasswordProtected && newPassword.length > 0 && newPassword !== confirmPassword, [settings.isPasswordProtected, newPassword, confirmPassword]);
  const passwordTooShort = useMemo(() => settings.isPasswordProtected && newPassword.length > 0 && newPassword.length < 6, [settings.isPasswordProtected, newPassword]);
  const canSaveSecurity = useMemo(() => !isSecurityLoading && (!settings.isPasswordProtected || (newPassword === "" || (newPassword.length >= 6 && newPassword === confirmPassword))), [isSecurityLoading, settings.isPasswordProtected, newPassword, confirmPassword]);

  if (authLoading || dataLoading || isDeleting) return (
    <HafashLoader text={isDeleting ? "Purging Studio Assets..." : "Preparing Gallery Workspace..."} />
  );

  if (error || !event) return (
    <div className="text-center py-20 bg-card border border-border/50 rounded-[2.5rem]">
      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
      <h2 className="text-2xl font-headline font-bold">Event not found</h2>
      <p className="text-muted-foreground mt-2">The requested workspace record could not be synchronized.</p>
      <Button className="mt-6 rounded-xl px-8" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/gallery/${event.slug || event.id}`;
  const replies = (event.replies || []) as { text: string, createdAt: string }[];
  const favoritesCount = Array.isArray(event.items) ? event.items.filter((i: any) => i.isFavorite).length : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Premium Hero Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-primary/5 z-0" />
        <div className="relative z-10 p-10 lg:p-14 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => router.push('/dashboard')}>
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-[0.3em] px-4 py-1">
                Studio Workspace / {event.category}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl lg:text-6xl font-headline font-bold tracking-tight">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="flex items-center gap-2.5 hover:text-primary transition-colors cursor-default"><UserIcon className="w-4 h-4 text-primary" /> {event.clientName}</span>
                <span className="flex items-center gap-2.5 hover:text-primary transition-colors cursor-default"><CalendarIcon className="w-4 h-4 text-primary" /> {event.date}</span>
                <span className="flex items-center gap-2.5 text-primary/80"><LayoutGridIcon className="w-4 h-4" /> {event.items?.length || 0} Delivered Assets</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Badge className={cn("rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider", event.isPublic ? "bg-green-500/10 text-green-500 border border-green-500/30" : "bg-destructive/10 text-destructive border border-destructive/30")}>
                {event.isPublic ? "Live Public Gallery" : "Private Session"}
              </Badge>
              <Badge className={cn("rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider", event.isPaid ? "bg-primary/10 text-primary border border-primary/30" : "bg-amber-500/10 text-amber-500 border border-amber-500/30")}>
                {event.isPaid ? "Revenue Settled" : "Awaiting Payment"}
              </Badge>
              {settings.isPasswordProtected && (
                <Badge className="rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                  <LockIcon className="w-3 h-3 mr-2" /> Password Protected
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link href={`/gallery/${event.slug || event.id}`} target="_blank" className="flex-1">
               <Button className="w-full rounded-2xl h-16 bg-white text-black hover:bg-gray-100 font-bold gap-3 shadow-2xl transition-all hover:scale-105">
                 <EyeIcon className="w-6 h-6" /> Open Preview
               </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-16 border-border/50 font-bold gap-3 bg-card/40 backdrop-blur-md transition-all hover:border-primary/40 hover:text-primary"
              onClick={() => handleCopy(galleryUrl)}
            >
              {copiedLink ? <CheckIcon className="w-6 h-6 text-green-500" /> : <CopyIcon className="w-6 h-6" />}
              {copiedLink ? "Link Copied" : "Copy Access Link"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Management Sections */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Delivered Masterpieces - Grid Management */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-10 py-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                  <ImageIcon className="w-8 h-8 text-primary" /> Visual Assets Hub
                </CardTitle>
                <CardDescription className="text-sm font-medium italic mt-1">Manage delivered high-resolution masterpieces and gallery curation.</CardDescription>
              </div>
              <Link href={`/events/${id}/upload`}>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-xl shadow-primary/20 h-12 px-6">
                  <ImageIcon className="w-5 h-5" /> Add Assets
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-10">
              {(!event.items || event.items.length === 0) ? (
                <div className="text-center py-24 border-2 border-dashed border-border/20 rounded-[2rem] bg-muted/5">
                  <LayoutGridIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                  <p className="text-muted-foreground italic font-headline text-xl">No photos have been delivered to this workspace yet.</p>
                  <Link href={`/events/${id}/upload`} className="mt-8 inline-block">
                    <Button variant="outline" className="rounded-xl border-primary/30 text-primary font-bold h-12 px-8">Launch Upload Center</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                  {event.items.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="group relative aspect-[4/5] rounded-[1.5rem] overflow-hidden border border-border/30 bg-muted shadow-xl">
                      <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" alt="Asset" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className={cn(
                            "w-full rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 shadow-lg",
                            event.coverImage === item.url ? "bg-green-500 text-white" : "bg-white text-black hover:bg-primary hover:text-white"
                          )}
                          onClick={() => event.coverImage !== item.url && handleSetCover(item.url)}
                          disabled={processingItems.has(item.id)}
                        >
                          {event.coverImage === item.url ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
                          {event.coverImage === item.url ? "Current Cover" : "Set as Cover"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="w-full rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 shadow-lg"
                          onClick={() => handleDeletePhoto(item)}
                          disabled={processingItems.has(item.id)}
                        >
                          {processingItems.has(item.id) ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <Trash2Icon className="w-4 h-4 mr-2" />}
                          Remove
                        </Button>
                      </div>
                      {event.coverImage === item.url && (
                        <div className="absolute top-4 left-4 bg-green-500 text-white p-1.5 rounded-full shadow-2xl ring-2 ring-white/20">
                          <CheckIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  {event.items.length > 12 && (
                    <div className="aspect-[4/5] rounded-[1.5rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-muted/20 luxury-card-hover group">
                      <span className="text-3xl font-headline font-bold text-primary group-hover:scale-110 transition-transform">{event.items.length - 12}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">More Assets</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement & Experience Strategy */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                <SparklesIcon className="w-8 h-8 text-primary" /> Engagement & Experience
              </CardTitle>
              <CardDescription className="text-sm font-medium italic mt-1">Configure the luxury welcome sequence and interactive storytelling elements.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              {/* Photographer Note */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <FileTextIcon className="w-5 h-5" /> Personalized Welcome Note
                  </Label>
                  <Badge variant="outline" className="text-[9px] border-border/50 bg-background/50 font-bold px-3">Studio Sync Active</Badge>
                </div>
                <Textarea 
                  placeholder="Compose a beautiful personalized note for your client. This appears first in their gallery experience..." 
                  className="min-h-[160px] rounded-[2rem] bg-background/50 border-border/50 p-8 text-lg italic focus:border-primary/50 transition-all shadow-inner custom-scrollbar"
                  value={settings.photographerNote}
                  onChange={(e) => setSettings({...settings, photographerNote: e.target.value})}
                />
              </div>

              {/* Splash Screen Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-border/20">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Experience Header</Label>
                    <Input 
                      placeholder="e.g., AHMED & FATIMA" 
                      className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50 text-base font-headline font-bold"
                      value={settings.welcomeTitle}
                      onChange={(e) => setSettings({...settings, welcomeTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Sub-text Greeting</Label>
                    <Input 
                      placeholder="A short, elegant invitation to view photos..." 
                      className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50 italic"
                      value={settings.welcomeMessage}
                      onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center justify-between p-6 bg-background/40 rounded-2xl border border-border/30 hover:border-primary/30 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-base font-bold">Luxury Splash Screen</Label>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Show entry splash experience.</p>
                    </div>
                    <Switch checked={settings.welcomeScreenEnabled} onCheckedChange={(val) => setSettings({...settings, welcomeScreenEnabled: val})} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-background/40 rounded-2xl border border-border/30 hover:border-primary/30 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-base font-bold">Interactive Feedback</Label>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Allow internal client replies.</p>
                    </div>
                    <Switch checked={settings.clientRepliesEnabled} onCheckedChange={(val) => setSettings({...settings, clientRepliesEnabled: val})} className="data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button className="rounded-xl px-14 h-14 font-bold shadow-2xl shadow-primary/20 transition-all hover:scale-105" onClick={handleUpdateSettings}>
                  Save Client Experience
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Feedback Feed */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-4">
                <MessageSquareIcon className="w-8 h-8 text-primary" /> Client Registry Feed
              </CardTitle>
              <CardDescription className="text-sm font-medium italic mt-1">Direct communications submitted via the secure internal feedback channel.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              {replies.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/20 rounded-[2rem] bg-muted/5">
                   <HistoryIcon className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                   <p className="text-muted-foreground italic font-headline text-xl">Your client hasn't sent any internal feedback yet.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
                  {replies.slice().reverse().map((reply, idx) => (
                    <div key={idx} className="p-8 bg-background/50 rounded-3xl border border-border/30 hover:border-primary/40 transition-all group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-4 py-1 border border-primary/20">Secure Response</Badge>
                        <span className="text-[11px] text-muted-foreground font-mono font-bold uppercase tracking-widest">{reply.createdAt ? format(new Date(reply.createdAt), 'MMM d, HH:mm') : 'N/A'}</span>
                      </div>
                      <p className="text-xl text-foreground/90 leading-relaxed italic font-headline">"{reply.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Sidebar & Settings */}
        <div className="space-y-10">
          
          {/* Live Insights Widget */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-primary luxury-card-hover">
            <CardHeader className="p-8 border-b border-border/30 bg-background/20">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">Live Asset Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-background/80 p-6 rounded-[1.5rem] border border-border/30 text-center space-y-2 group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Studio Views</p>
                  <p className="text-4xl font-headline font-bold text-primary group-hover:scale-110 transition-transform duration-500">{event.viewCount || 0}</p>
                </div>
                <div className="bg-background/80 p-6 rounded-[1.5rem] border border-border/30 text-center space-y-2 group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Selections</p>
                  <p className="text-4xl font-headline font-bold text-primary group-hover:scale-110 transition-transform duration-500">{favoritesCount}</p>
                </div>
              </div>
              
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between p-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Public Access</span>
                  <Switch checked={event.isPublic} onCheckedChange={(val) => updateToggle('isPublic', val)} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Master Downloads</span>
                  <Switch checked={!event.isLocked} onCheckedChange={(val) => updateToggle('isLocked', !val)} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-border/20">
                   <div className="space-y-1">
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] block">Revenue Status</span>
                     <span className={cn("text-[10px] font-bold uppercase tracking-widest", event.isPaid ? "text-green-500" : "text-amber-500")}>
                        {event.isPaid ? "Payment Settled" : "Awaiting Fees"}
                     </span>
                   </div>
                  <Switch checked={event.isPaid} onCheckedChange={(val) => updateToggle('isPaid', val)} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            </CardContent>
            
            {/* Quick Share Footer */}
            <div className="p-8 bg-primary/5 border-t border-border/30">
               <Label className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mb-4 block">Direct Studio Access</Label>
               <div className="flex gap-3">
                  <Input readOnly value={galleryUrl} className="h-12 text-[10px] bg-background/50 border-border/50 rounded-xl font-mono text-primary shadow-inner" />
                  <Button size="icon" variant="outline" className="rounded-xl h-12 w-12 shrink-0 border-primary/30 text-primary hover:bg-primary/10 transition-all hover:scale-105" onClick={() => handleCopy(galleryUrl)}>
                    <LinkIcon className="w-5 h-5" />
                  </Button>
               </div>
            </div>
          </Card>

          {/* Gallery Security Suite */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-amber-500 luxury-card-hover">
            <CardHeader className="p-8 border-b border-border/30 bg-background/20">
              <CardTitle className="text-base font-headline font-bold flex items-center gap-3">
                <ShieldAlertIcon className="w-5 h-5 text-amber-500" /> Private Access Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
               <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Enable Protection</Label>
                  <Switch 
                    checked={settings.isPasswordProtected} 
                    onCheckedChange={(val) => setSettings({...settings, isPasswordProtected: val})} 
                    className="data-[state=checked]:bg-amber-500"
                  />
               </div>
               
               {settings.isPasswordProtected && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Access Key</Label>
                         {newPassword && (
                           <button 
                             onClick={handleCopyPassword}
                             className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                           >
                             Copy Key
                           </button>
                         )}
                       </div>
                       <div className="relative">
                          <LockIcon className="absolute left-4 top-4 w-5 h-5 text-primary" />
                          <Input 
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••••••" 
                            className="pl-12 pr-20 rounded-xl h-14 bg-background/50 border-border/50 focus:border-primary/50 font-bold" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <div className="absolute right-4 top-3 flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={handleCopyPassword}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              title="Copy Password"
                            >
                              <CopyIcon className="w-5 h-5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                            >
                              {showNewPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                          </div>
                       </div>
                       {passwordTooShort && (
                         <p className="text-[10px] text-destructive font-bold uppercase tracking-widest flex items-center gap-2 px-1">
                           <AlertCircleIcon className="w-3.5 h-3.5" /> Minimum 6 characters required.
                         </p>
                       )}
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm Access Key</Label>
                       <div className="relative">
                          <LockIcon className="absolute left-4 top-4 w-5 h-5 text-primary" />
                          <Input 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••••••" 
                            className={cn(
                              "pl-12 pr-12 rounded-xl h-14 bg-background/50 border-border/50 font-bold transition-all",
                              passwordMismatch ? "border-destructive/50 focus:border-destructive/50 bg-destructive/5" : "focus:border-primary/50"
                            )} 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-4 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                       </div>
                       {passwordMismatch && (
                         <p className="text-[10px] text-destructive font-bold uppercase tracking-widest flex items-center gap-2 px-1">
                           <AlertCircleIcon className="w-3.5 h-3.5" /> Access keys do not match.
                         </p>
                       )}
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-dashed border-primary/30 text-[10px] font-bold uppercase tracking-[0.3em] gap-3 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                      onClick={handleGeneratePassword}
                    >
                      <SparklesIcon className="w-4 h-4" /> Generate Secure Key
                    </Button>
                    
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed text-center px-4">
                      Leave empty to maintain existing studio security.
                    </p>
                 </div>
               )}
               
               <Button 
                className="w-full rounded-xl font-bold h-14 shadow-2xl transition-all hover:scale-105 active:scale-95" 
                onClick={handleSaveSecurity}
                disabled={!canSaveSecurity}
               >
                 {isSecurityLoading ? <Loader2Icon className="w-5 h-5 animate-spin mr-3" /> : <ShieldCheckIcon className="w-5 h-5 mr-3" />}
                 Synchronize Access Rules
               </Button>
            </CardContent>
          </Card>

          {/* Album Workflow Module */}
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-4 border-t-primary luxury-card-hover">
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
                    <SelectTrigger className="w-full h-14 rounded-xl bg-background/50 border-border/50 font-bold text-[11px] uppercase tracking-widest transition-all hover:border-primary/40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50 rounded-2xl p-2 shadow-2xl">
                      <SelectItem value="New Selection" className="text-[11px] uppercase font-bold rounded-xl cursor-pointer">New Selection</SelectItem>
                      <SelectItem value="Album Package Generated" className="text-[11px] uppercase font-bold rounded-xl cursor-pointer">Package Ready</SelectItem>
                      <SelectItem value="Shared with Album Designer" className="text-[11px] uppercase font-bold rounded-xl cursor-pointer">In Production</SelectItem>
                      <SelectItem value="Completed" className="text-[11px] uppercase font-bold text-green-500 rounded-xl cursor-pointer">Delivered & Closed</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 flex items-center gap-4 group transition-colors hover:bg-primary/10">
                  <ShieldCheckIcon className="w-6 h-6 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{favoritesCount} Selection Favorites Syncing</span>
               </div>
            </CardContent>
            <div className="p-8 pt-0">
               <Link href="/album-selections">
                  <Button variant="link" className="w-full text-[11px] font-bold uppercase tracking-widest text-primary gap-3 h-auto py-0 hover:no-underline hover:scale-105 transition-transform">
                    Open Workflow Portal <ExternalLinkIcon className="w-4 h-4" />
                  </Button>
               </Link>
            </div>
          </Card>

          {/* System Settings & Danger Zone */}
          <div className="space-y-6">
             <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl luxury-card-hover">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-base font-headline font-bold flex items-center gap-3">
                    <SettingsIcon className="w-5 h-5 text-primary" /> Workspace Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Workspace Title</Label>
                      <Input 
                        value={settings.title} 
                        onChange={(e) => setSettings({...settings, title: e.target.value})} 
                        className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold" 
                      />
                   </div>
                   <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Primary Client</Label>
                      <Input 
                        value={settings.clientName} 
                        onChange={(e) => setSettings({...settings, clientName: e.target.value})} 
                        className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50 text-base font-bold" 
                      />
                   </div>
                   <Button className="w-full rounded-xl font-bold h-14 shadow-lg transition-all hover:scale-105" onClick={handleUpdateSettings}>Save Metadata</Button>
                </CardContent>
             </Card>

             <Card className="bg-destructive/5 border-destructive/20 rounded-[2.5rem] overflow-hidden luxury-card-hover">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-base font-headline font-bold text-destructive flex items-center gap-3">
                    <Trash2Icon className="w-5 h-5" /> Permanent Purge
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-[11px] text-destructive/70 mb-6 leading-relaxed italic font-medium">
                    Destroying this workspace will immediately revoke client access and purge all record telemetry from the studio vault.
                  </p>
                  <Button variant="destructive" className="w-full rounded-xl font-bold h-12 text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-destructive/20 transition-all hover:scale-105" onClick={() => setShowDeleteDialog(true)}>
                    Delete Gallery Record
                  </Button>
                </CardContent>
             </Card>
          </div>
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
              <p className="text-sm font-medium italic">To proceed with permanent deletion, please type the confirmation key below. This will purge all cloud assets.</p>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-destructive">Verification Key</Label>
                <Input placeholder="Type DELETE..." className="text-center font-bold h-14 rounded-xl border-destructive/30 focus:border-destructive text-lg tracking-widest bg-destructive/5" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-4 mt-10">
            <AlertDialogCancel className="rounded-xl flex-1 h-14 font-bold uppercase tracking-widest text-[10px]">Abort</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1 h-14 uppercase tracking-widest text-[10px] shadow-xl shadow-destructive/20" onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'}>
              Destroy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
