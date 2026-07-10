"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Share2, 
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  Loader2,
  Globe,
  Settings,
  Link as LinkIcon,
  Check,
  FileText,
  MessageSquare,
  History,
  Sparkles,
  Lock,
  Unlock,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Archive,
  Calendar,
  User,
  Copy,
  LayoutGrid
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
import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    albumStatus: 'New Selection'
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
        albumStatus: event.albumStatus || 'New Selection'
      });
    }
  }, [event]);

  const handleUpdateSettings = async () => {
    if (!eventRef) return;
    try {
      await updateDoc(eventRef, { ...settings, updatedAt: new Date().toISOString() });
      toast({ title: "Settings Saved", description: "Gallery metadata and experience settings updated." });
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
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (authLoading || dataLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!isDeleting && (error || !event)) return (
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Premium Hero Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-primary/5 z-0" />
        <div className="relative z-10 p-8 lg:p-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Badge variant="outline" className="border-primary/30 text-primary text-[8px] uppercase font-bold tracking-widest px-3 py-0.5">
                Studio Workspace / {event.category}
              </Badge>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl lg:text-5xl font-headline font-bold tracking-tight">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><User className="w-3 h-3 text-primary" /> {event.clientName}</span>
                <span className="flex items-center gap-2"><Calendar className="w-3 h-3 text-primary" /> {event.date}</span>
                <span className="flex items-center gap-2 text-primary/80"><LayoutGrid className="w-3 h-3" /> {event.items?.length || 0} Delivered Assets</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge className={cn("rounded-lg px-3 py-1 font-bold text-[9px] uppercase tracking-tighter", event.isPublic ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
                {event.isPublic ? "Live Public Gallery" : "Private Session"}
              </Badge>
              <Badge className={cn("rounded-lg px-3 py-1 font-bold text-[9px] uppercase tracking-tighter", event.isPaid ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500")}>
                {event.isPaid ? "Revenue Settled" : "Awaiting Payment"}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Link href={`/gallery/${event.slug || event.id}`} target="_blank" className="flex-1">
               <Button className="w-full rounded-2xl h-14 bg-white text-black hover:bg-gray-100 font-bold gap-3 shadow-xl">
                 <Eye className="w-5 h-5" /> Open Preview
               </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-14 border-border/50 font-bold gap-3 bg-card/50 backdrop-blur-md"
              onClick={() => handleCopy(galleryUrl)}
            >
              {copiedLink ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              {copiedLink ? "Link Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Management Sections */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Delivered Masterpieces - Grid Management */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-primary" /> Visual Assets Hub
                </CardTitle>
                <CardDescription>Manage delivered high-resolution masterpieces and gallery curation.</CardDescription>
              </div>
              <Link href={`/events/${id}/upload`}>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/20">
                  <ImageIcon className="w-4 h-4" /> Add Photos
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-8">
              {(!event.items || event.items.length === 0) ? (
                <div className="text-center py-20 border-2 border-dashed border-border/20 rounded-3xl bg-muted/10">
                  <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground italic font-headline text-lg">No photos have been delivered to this workspace yet.</p>
                  <Link href={`/events/${id}/upload`} className="mt-6 inline-block">
                    <Button variant="outline" className="rounded-xl border-primary/30 text-primary font-bold">Launch Upload Center</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {event.items.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-border/30 bg-muted shadow-md">
                      <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="Asset" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center backdrop-blur-[2px]">
                        <Button 
                          size="sm" 
                          className={cn(
                            "w-full rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all",
                            event.coverImage === item.url ? "bg-green-500 text-white" : "bg-white text-black"
                          )}
                          onClick={() => event.coverImage !== item.url && handleSetCover(item.url)}
                        >
                          {event.coverImage === item.url ? <Check className="w-3 h-3 mr-1" /> : null}
                          {event.coverImage === item.url ? "Main Cover" : "Set as Cover"}
                        </Button>
                      </div>
                      {event.coverImage === item.url && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white p-1 rounded-full shadow-lg ring-1 ring-white/20">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {event.items.length > 12 && (
                    <div className="aspect-[4/5] rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-muted/20">
                      <span className="text-2xl font-headline font-bold text-primary">+{event.items.length - 12}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">More Assets</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement & Experience Strategy */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-8">
              <CardTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" /> Engagement & Experience
              </CardTitle>
              <CardDescription>Configure the luxury welcome sequence and interactive storytelling elements.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              {/* Photographer Note */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Personalized Welcome Note
                  </Label>
                  <Badge variant="outline" className="text-[8px] border-border/50">Internal Sync Active</Badge>
                </div>
                <Textarea 
                  placeholder="Compose a beautiful personalized note for your client. This appears first in their gallery experience..." 
                  className="min-h-[140px] rounded-2xl bg-background/50 border-border/50 p-6 text-base italic focus:border-primary/50 transition-all"
                  value={settings.photographerNote}
                  onChange={(e) => setSettings({...settings, photographerNote: e.target.value})}
                />
              </div>

              {/* Splash Screen Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/20">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Experience Header</Label>
                    <Input 
                      placeholder="e.g., AHMED & FATIMA" 
                      className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50"
                      value={settings.welcomeTitle}
                      onChange={(e) => setSettings({...settings, welcomeTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sub-text Greeting</Label>
                    <Input 
                      placeholder="A short, elegant invitation to view photos..." 
                      className="rounded-xl h-12 bg-background/50 border-border/50 focus:border-primary/50"
                      value={settings.welcomeMessage}
                      onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-5 bg-background/40 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Luxury Welcome Screen</Label>
                      <p className="text-[10px] text-muted-foreground">Show entry splash experience.</p>
                    </div>
                    <Switch checked={settings.welcomeScreenEnabled} onCheckedChange={(val) => setSettings({...settings, welcomeScreenEnabled: val})} />
                  </div>
                  <div className="flex items-center justify-between p-5 bg-background/40 rounded-2xl border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Interactive Feedback</Label>
                      <p className="text-[10px] text-muted-foreground">Allow internal client replies.</p>
                    </div>
                    <Switch checked={settings.clientRepliesEnabled} onCheckedChange={(val) => setSettings({...settings, clientRepliesEnabled: val})} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="rounded-xl px-12 h-14 font-bold shadow-xl shadow-primary/10" onClick={handleUpdateSettings}>
                  Save Client Experience
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Feedback Feed */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-border/30 px-8 py-8">
              <CardTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary" /> Client Feedback Registry
              </CardTitle>
              <CardDescription>Direct communications submitted via the secure internal feedback channel.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {replies.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border/20 rounded-3xl bg-muted/5">
                   <History className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                   <p className="text-muted-foreground italic font-headline text-lg">Your client hasn't sent any internal feedback yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {replies.slice().reverse().map((reply, idx) => (
                    <div key={idx} className="p-6 bg-background/50 rounded-2xl border border-border/30 hover:border-primary/30 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-primary/10 text-primary text-[8px] uppercase px-3">Secure Response</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono font-medium">{reply.createdAt ? format(new Date(reply.createdAt), 'MMM d, HH:mm') : 'N/A'}</span>
                      </div>
                      <p className="text-base text-foreground/90 leading-relaxed italic">"{reply.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Sidebar & Settings */}
        <div className="space-y-8">
          
          {/* Live Insights Widget */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg border-t-4 border-t-primary">
            <CardHeader className="p-6 border-b border-border/30">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Live Asset Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/80 p-5 rounded-2xl border border-border/30 text-center space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total Views</p>
                  <p className="text-3xl font-headline font-bold text-primary">{event.viewCount || 0}</p>
                </div>
                <div className="bg-background/80 p-5 rounded-2xl border border-border/30 text-center space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Favorites</p>
                  <p className="text-3xl font-headline font-bold text-primary">{favoritesCount}</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase tracking-widest">Public Access</span>
                  <Switch checked={event.isPublic} onCheckedChange={(val) => updateToggle('isPublic', val)} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase tracking-widest">Master Downloads</span>
                  <Switch checked={!event.isLocked} onCheckedChange={(val) => updateToggle('isLocked', !val)} />
                </div>
                <div className="flex items-center justify-between text-xs pt-4 border-t border-border/30">
                   <div className="space-y-0.5">
                     <span className="font-bold text-muted-foreground uppercase tracking-widest block">Payment Status</span>
                     <span className={cn("text-[9px] font-bold uppercase", event.isPaid ? "text-green-500" : "text-amber-500")}>
                        {event.isPaid ? "Settled" : "Outstanding Balance"}
                     </span>
                   </div>
                  <Switch checked={event.isPaid} onCheckedChange={(val) => updateToggle('isPaid', val)} />
                </div>
              </div>
            </CardContent>
            
            {/* Quick Share Footer */}
            <div className="p-6 bg-primary/5 border-t border-border/30">
               <Label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-3 block">Direct Access Link</Label>
               <div className="flex gap-2">
                  <Input readOnly value={galleryUrl} className="h-10 text-[10px] bg-background/50 border-border/50 rounded-xl font-mono" />
                  <Button size="icon" variant="outline" className="rounded-xl h-10 w-10 shrink-0 hover:bg-primary/10" onClick={() => handleCopy(galleryUrl)}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
               </div>
            </div>
          </Card>

          {/* Album Workflow Module */}
          <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="p-6 border-b border-border/30">
              <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                <Archive className="w-4 h-4 text-primary" /> Album Fulfillment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Workflow Phase</Label>
                  <Select 
                    value={settings.albumStatus} 
                    onValueChange={(val) => {
                      setSettings({...settings, albumStatus: val});
                      if (eventRef) updateDoc(eventRef, { albumStatus: val });
                      toast({ title: "Workflow Updated" });
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-background border-border/50 font-bold text-[10px] uppercase tracking-widest">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      <SelectItem value="New Selection" className="text-[10px] uppercase font-bold">New Selection</SelectItem>
                      <SelectItem value="Album Package Generated" className="text-[10px] uppercase font-bold">Package Ready</SelectItem>
                      <SelectItem value="Shared with Album Designer" className="text-[10px] uppercase font-bold">In Production</SelectItem>
                      <SelectItem value="Completed" className="text-[10px] uppercase font-bold text-green-500">Delivered & Closed</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{favoritesCount} Selected Files Syncing</span>
               </div>
            </CardContent>
            <div className="p-6 pt-0">
               <Link href="/album-selections">
                  <Button variant="link" className="w-full text-[10px] font-bold uppercase text-primary gap-2 h-auto py-0">
                    Open Workflow Portal <ExternalLink className="w-3 h-3" />
                  </Button>
               </Link>
            </div>
          </Card>

          {/* System Settings & Danger Zone */}
          <div className="space-y-4">
             <Card className="bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-md">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" /> Event Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Workspace Title</Label>
                      <Input 
                        value={settings.title} 
                        onChange={(e) => setSettings({...settings, title: e.target.value})} 
                        className="rounded-xl h-11 bg-background/50 border-border/50" 
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Primary Client Name</Label>
                      <Input 
                        value={settings.clientName} 
                        onChange={(e) => setSettings({...settings, clientName: e.target.value})} 
                        className="rounded-xl h-11 bg-background/50 border-border/50" 
                      />
                   </div>
                   <Button className="w-full rounded-xl font-bold h-12" onClick={handleUpdateSettings}>Save Updates</Button>
                </CardContent>
             </Card>

             <Card className="bg-destructive/5 border-destructive/20 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-sm font-headline font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Permanent Removal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-[10px] text-destructive/70 mb-4 leading-relaxed italic">
                    Destroying this workspace will immediately revoke client access and purge all record telemetry.
                  </p>
                  <Button variant="destructive" className="w-full rounded-xl font-bold h-11 text-[10px] uppercase tracking-widest" onClick={() => setShowDeleteDialog(true)}>
                    Delete Gallery Record
                  </Button>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50 rounded-[2.5rem] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-center">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4 pt-4">
              <p className="text-sm">To proceed with permanent deletion, type <span className="text-destructive font-mono font-bold px-2 py-0.5 bg-destructive/10 rounded">DELETE</span> below.</p>
              <Input placeholder="Type DELETE..." className="text-center font-bold h-12 rounded-xl" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl flex-1 h-12 font-bold">Abort Action</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1 h-12" onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'}>
              Destroy Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
