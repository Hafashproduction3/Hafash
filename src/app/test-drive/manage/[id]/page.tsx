
"use client";

import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { 
  Trash2 as Trash2Icon, 
  Image as ImageIcon,
  ArrowLeft as ArrowLeftIcon,
  Eye as EyeIcon,
  Loader2 as Loader2Icon,
  FileText as FileTextIcon,
  Sparkles as SparklesIcon,
  Camera as CameraIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  LayoutGrid as LayoutGridIcon,
  AlertCircle as AlertCircleIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Archive as ArchiveIcon,
  ExternalLink as ExternalLinkIcon,
  Zap,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { HafashLoader } from '@/components/ui/hafash-loader';

export default function TestDriveManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const { events, updateEvent, deleteEvent } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [settings, setSettings] = useState({
    photographerNote: '',
    albumStatus: 'New Selection',
    isPublic: true,
    isPaid: false,
    isLocked: true
  });

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const event = useMemo(() => events.find(e => e.id === id), [events, id]);

  useEffect(() => {
    if (event) {
      setSettings({
        photographerNote: event.photographerNote || '',
        albumStatus: event.albumStatus || 'New Selection',
        isPublic: !!event.isPublic,
        isPaid: !!event.isPaid,
        isLocked: !!event.isLocked
      });
    }
  }, [event]);

  const handleUpdateSettings = useCallback(() => {
    updateEvent(id, { 
      photographerNote: settings.photographerNote
    });
    toast({ title: "Settings Saved" });
  }, [id, settings.photographerNote, updateEvent, toast]);

  const handleSetCover = useCallback((imageUrl: string) => {
    updateEvent(id, { coverImage: imageUrl });
    toast({ title: "Cover Updated" });
  }, [id, updateEvent, toast]);

  const handleDeletePhoto = useCallback((itemId: string) => {
    if (!event) return;
    const updatedItems = (event.items || []).filter(item => item.id !== itemId);
    updateEvent(id, { items: updatedItems });
    toast({ title: "Asset Removed" });
  }, [event, id, updateEvent, toast]);

  const confirmDelete = () => {
    if (deleteConfirmText !== 'DELETE') return;
    deleteEvent(id);
    toast({ title: "Test Gallery Deleted" });
    router.replace('/test-drive');
  };

  const updateToggle = useCallback((field: string, value: any) => {
    const updateData: any = { [field]: value };
    if (field === 'isPaid') {
      updateData.isLocked = !value;
    }
    updateEvent(id, updateData);
  }, [id, updateEvent]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isHydrated) {
    return <HafashLoader text="Loading Workspace..." />;
  }

  if (!event) return (
    <div className="text-center py-40 bg-card/20 backdrop-blur-md border border-white/5 rounded-[3rem] animate-in fade-in duration-700">
      <ImageIcon className="w-20 h-20 text-muted-foreground mx-auto mb-8 opacity-20" />
      <h2 className="text-4xl font-headline font-bold text-white uppercase tracking-tight">Test Event not found</h2>
      <Button className="mt-10 rounded-2xl h-14 px-12 bg-primary text-primary-foreground font-bold shadow-2xl" onClick={() => router.push('/test-drive')}>Back to Dashboard</Button>
    </div>
  );

  const galleryUrl = `${origin}/test-drive/gallery/${event.id}`;
  const favoritesCount = Array.isArray(event.items) ? event.items.filter((i: any) => i.isFavorite).length : 0;

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* 3D Glass Hero Section */}
      <div className="relative rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/95 to-background z-0" />
        <div className="absolute -inset-20 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] opacity-5 blur-3xl group-hover:opacity-10 transition-opacity duration-1000" />
        
        <div className="relative z-10 p-12 lg:p-20 flex flex-col lg:row justify-between items-start lg:items-center gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white/5 hover:bg-primary hover:text-primary-foreground border border-white/10 transition-all shadow-xl" onClick={() => router.push('/test-drive')}>
                <ArrowLeftIcon className="w-6 h-6" />
              </Button>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-[0.4em] px-6 py-2 rounded-xl backdrop-blur-md">
                Test Workspace / {event.category}
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="text-6xl lg:text-8xl font-headline font-bold tracking-tighter text-white drop-shadow-2xl leading-none">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-10 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">
                <span className="flex items-center gap-3"><UserIcon className="w-4 h-4 text-primary" /> {event.clientName}</span>
                <span className="flex items-center gap-3"><CalendarIcon className="w-4 h-4 text-primary" /> {event.date}</span>
                <span className="flex items-center gap-3 text-primary"><LayoutGridIcon className="w-4 h-4" /> {event.items?.length || 0} Assets</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
            <Link href={`/test-drive/gallery/${event.id}`} target="_blank" className="flex-1">
               <Button className="w-full rounded-[1.5rem] h-20 bg-white text-black hover:bg-gray-100 font-bold gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:translate-y-[-4px] transition-all active:scale-95 text-lg">
                 <EyeIcon className="w-7 h-7" /> Preview
               </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1 rounded-[1.5rem] h-20 border-white/10 font-bold gap-4 bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all hover:translate-y-[-4px] shadow-2xl text-lg"
              onClick={() => handleCopy(galleryUrl)}
            >
              {copiedLink ? <CheckIcon className="w-7 h-7 text-green-500" /> : <CopyIcon className="w-7 h-7" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Visual Assets 3D Grid */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl luxury-card-hover">
            <CardHeader className="bg-white/5 border-b border-white/5 px-12 py-12 flex flex-row items-center justify-between">
              <CardTitle className="text-4xl font-headline font-bold flex items-center gap-6 text-white">
                <ImageIcon className="w-10 h-10 text-primary" /> Visual Assets
              </CardTitle>
              <Link href={`/test-drive/upload/${id}`}>
                <Button className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 shadow-[0_15px_30px_rgba(212,175,55,0.2)] h-14 px-10 hover:translate-y-[-2px] transition-all">
                  <ImageIcon className="w-5 h-5" /> Add Assets
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-12">
              {(!event.items || event.items.length === 0) ? (
                <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-background/20">
                  <LayoutGridIcon className="w-20 h-20 text-muted-foreground mx-auto mb-8 opacity-10" />
                  <p className="text-muted-foreground italic font-headline text-2xl">No photos delivered yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-8">
                  {event.items.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/5 bg-background shadow-2xl hover:translate-y-[-8px] transition-all duration-700">
                      {item.url && (
                        <img src={item.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Asset" />
                      )}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center backdrop-blur-md gap-3">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className={cn(
                            "w-full rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] h-12 shadow-2xl transition-all",
                            event.coverImage === item.url ? "bg-primary text-primary-foreground border-none" : "bg-white text-black hover:bg-gray-100"
                          )}
                          onClick={() => event.coverImage !== item.url && handleSetCover(item.url)}
                        >
                          {event.coverImage === item.url ? "Active Cover" : "Set Cover"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="w-full rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] h-12 shadow-2xl transition-all active:scale-95"
                          onClick={() => handleDeletePhoto(item.id)}
                        >
                          <Trash2Icon className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {event.items.length > 12 && (
                    <div className="aspect-[4/5] rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm group hover:border-primary/40 transition-all">
                      <span className="text-5xl font-headline font-bold text-primary drop-shadow-2xl">{event.items.length - 12}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/60 mt-4 group-hover:text-primary transition-colors">More Assets</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategy Section */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl luxury-card-hover">
            <CardHeader className="bg-white/5 border-b border-white/5 px-12 py-12">
              <CardTitle className="text-4xl font-headline font-bold flex items-center gap-6 text-white">
                <SparklesIcon className="w-10 h-10 text-primary" /> Experience Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-12 space-y-12">
              <div className="space-y-8">
                <Label className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary flex items-center gap-4">
                  <FileTextIcon className="w-5 h-5" /> Personalized Welcome Note
                </Label>
                <Textarea 
                  placeholder="Compose a beautiful personalized note for your test clients..." 
                  className="min-h-[200px] rounded-[2.5rem] bg-background/40 border-white/10 p-10 text-xl italic focus:border-primary/50 text-white/90 shadow-inner transition-all leading-relaxed"
                  value={settings.photographerNote}
                  onChange={(e) => setSettings({...settings, photographerNote: e.target.value})}
                />
              </div>
              <div className="flex justify-end">
                <Button className="rounded-2xl px-16 h-16 font-bold shadow-[0_20px_40px_rgba(212,175,55,0.1)] text-lg hover:translate-y-[-2px] transition-all active:scale-95" onClick={handleUpdateSettings}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Telemetry Panels */}
        <div className="space-y-12">
          {/* Telemetry Panel */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl border-t-4 border-t-primary luxury-card-hover">
            <CardHeader className="p-10 border-b border-white/5 bg-background/20">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.5em] text-primary flex items-center gap-3">
                <Zap className="w-4 h-4 animate-pulse" /> Test Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-background/60 p-8 rounded-[2rem] border border-white/5 text-center space-y-3 shadow-inner group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">Views</p>
                  <p className="text-5xl font-headline font-bold text-primary drop-shadow-2xl">{event.viewCount || 0}</p>
                </div>
                <div className="bg-background/60 p-8 rounded-[2rem] border border-white/5 text-center space-y-3 shadow-inner group">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">Favorites</p>
                  <p className="text-5xl font-headline font-bold text-primary drop-shadow-2xl">{favoritesCount}</p>
                </div>
              </div>
              
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between p-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Public Access</span>
                  <Switch checked={settings.isPublic} onCheckedChange={(val) => {
                    setSettings({...settings, isPublic: val});
                    updateToggle('isPublic', val);
                  }} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Download Rights</span>
                  <Switch checked={!settings.isLocked} onCheckedChange={(val) => {
                    setSettings({...settings, isLocked: !val});
                    updateToggle('isLocked', !val);
                  }} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between pt-10 border-t border-white/5">
                   <div className="space-y-2">
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em] block">Revenue Status</span>
                     <Badge className={cn("text-[10px] font-bold uppercase tracking-widest px-4 py-1", settings.isPaid ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500")}>
                        {settings.isPaid ? "Payment Received" : "Awaiting Transfer"}
                     </Badge>
                   </div>
                  <Switch checked={settings.isPaid} onCheckedChange={(val) => {
                    setSettings({...settings, isPaid: val, isLocked: !val});
                    updateToggle('isPaid', val);
                  }} className="data-[state=checked]:bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Panel */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl border-t-4 border-t-primary luxury-card-hover">
            <CardHeader className="p-10 border-b border-white/5 bg-background/20">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-4 text-white">
                <ArchiveIcon className="w-6 h-6 text-primary" /> Workflow Phase
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
               <div className="space-y-4">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Select Current Phase</Label>
                  <select 
                    className="w-full h-16 rounded-2xl bg-background/60 border border-white/10 font-bold text-[11px] uppercase tracking-[0.3em] px-6 focus:outline-none focus:border-primary/50 text-white shadow-inner transition-all appearance-none"
                    value={settings.albumStatus} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({...settings, albumStatus: val});
                      updateEvent(id, { albumStatus: val });
                    }}
                  >
                    <option value="New Selection" className="bg-card">New Selection</option>
                    <option value="Album Package Generated" className="bg-card">Package Ready</option>
                    <option value="Shared with Album Designer" className="bg-card">In Production</option>
                    <option value="Completed" className="bg-card">Completed</option>
                  </select>
               </div>
               <Link href="/test-drive/workflow" className="block">
                  <Button variant="ghost" className="w-full h-14 rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] text-primary gap-4 hover:bg-primary/10 transition-all">
                    Open Workflow Portal <ExternalLinkIcon className="w-4 h-4" />
                  </Button>
               </Link>
            </CardContent>
          </Card>

          {/* Dangerous Zone */}
          <Card className="bg-destructive/5 border border-destructive/20 rounded-[3rem] overflow-hidden group shadow-2xl">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-lg font-headline font-bold text-destructive flex items-center gap-4">
                <Trash2Icon className="w-6 h-6" /> Permanent Removal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <Button variant="destructive" className="w-full rounded-2xl font-bold h-16 text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:translate-y-[-2px] transition-all active:scale-95" onClick={() => setShowDeleteDialog(true)}>
                Destroy Test Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3D Premium Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] max-w-md p-12 shadow-[0_50px_100px_rgba(0,0,0,0.6)] overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />
          <AlertDialogHeader>
            <div className="bg-destructive/10 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 ring-8 ring-destructive/5 shadow-inner">
              <AlertCircleIcon className="w-14 h-14 text-destructive" />
            </div>
            <AlertDialogTitle className="text-3xl font-headline font-bold text-center text-white">Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-8 pt-6">
              <p className="text-base font-medium italic text-muted-foreground leading-relaxed px-4">
                This action will permanently purge this test record from your session. Type <span className="text-destructive font-bold not-italic">DELETE</span> below.
              </p>
              <Input 
                placeholder="Type DELETE..." 
                className="text-center font-bold h-16 rounded-2xl border-white/10 bg-background/50 text-xl tracking-[0.2em] focus:border-destructive/50" 
                value={deleteConfirmText} 
                onChange={(e) => setDeleteConfirmText(e.target.value)} 
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-5 mt-12">
            <AlertDialogCancel className="rounded-2xl flex-1 h-16 font-bold uppercase text-[11px] tracking-[0.2em] border-white/10 hover:bg-white/5 transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-bold flex-1 h-16 uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed" 
              onClick={confirmDelete} 
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
