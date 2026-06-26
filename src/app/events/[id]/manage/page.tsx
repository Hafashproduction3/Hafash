
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
  Loader2,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  History,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function EventManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
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

  const favoritesCount = event.items?.filter((i: any) => i.isFavorite).length || 0;

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAlbumPackage = () => {
    if (!firestore || !user || favoritesCount === 0) return;
    setIsGenerating(true);

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const updateData = {
      albumLinkToken: token,
      albumLinkEnabled: true,
      albumLinkCreated: new Date().toISOString(),
      albumStatus: "Album Package Generated"
    };

    updateDoc(eventRef!, updateData)
      .then(() => {
        toast({ title: "Success", description: "Secure Album Package generated." });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      })
      .finally(() => setIsGenerating(false));
  };

  const updateStatus = (val: string) => {
    if (!firestore || !user || !eventRef) return;
    updateDoc(eventRef, { albumStatus: val });
    toast({ title: "Status Updated", description: `Workflow status set to: ${val}` });
  };

  const toggleAlbumLink = (status: boolean) => {
    if (!firestore || !user || !eventRef) return;
    updateDoc(eventRef, { albumLinkEnabled: !status });
  };

  const handleDelete = () => {
    if (!firestore || !user || !confirm('Are you sure you want to delete this event? This will permanently remove all associated telemetry.')) return;
    deleteDoc(eventRef!)
      .then(() => {
        toast({ title: "Event Purged" });
        router.push('/dashboard');
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
          {/* Album Selections Section */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl ring-1 ring-primary/10">
            <CardHeader className="border-b border-border/30 bg-primary/5 px-8 py-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  Workflow Management
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Selection Status:</span>
                  <Select value={event.albumStatus || "New Selection"} onValueChange={updateStatus}>
                    <SelectTrigger className="w-[200px] h-9 rounded-full bg-background border-border/50 font-bold text-[10px] uppercase tracking-wider">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      <SelectItem value="New Selection" className="text-[10px] uppercase font-bold">New Selection</SelectItem>
                      <SelectItem value="Album Package Generated" className="text-[10px] uppercase font-bold">Package Generated</SelectItem>
                      <SelectItem value="Shared with Album Designer" className="text-[10px] uppercase font-bold">Shared with Designer</SelectItem>
                      <SelectItem value="Completed" className="text-[10px] uppercase font-bold text-green-500">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {!event.albumLinkToken ? (
                <div className="text-center py-12 space-y-6">
                  <div className="max-w-md mx-auto space-y-2">
                    <h4 className="text-xl font-headline font-bold">Synchronize Selection</h4>
                    <p className="text-sm text-muted-foreground italic">
                      Group the client's {favoritesCount} favorites into a secure designer portal. This gives external collaborators access to original high-resolution master files.
                    </p>
                  </div>
                  <Button 
                    className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 px-10 shadow-lg shadow-primary/20"
                    onClick={generateAlbumPackage}
                    disabled={favoritesCount === 0 || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Generate Secure Package
                  </Button>
                  {favoritesCount === 0 && (
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <Lock className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Client has not selected favorites</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-background rounded-2xl border border-border/30 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          {event.albumLinkEnabled ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-destructive" />}
                          Access Control
                        </h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                          {event.albumLinkEnabled ? "Designer Portal Active" : "Portal Access Restricted"}
                        </p>
                      </div>
                      <Switch 
                        checked={event.albumLinkEnabled} 
                        onCheckedChange={() => toggleAlbumLink(event.albumLinkEnabled)} 
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    
                    <div className="p-6 bg-background rounded-2xl border border-border/30 flex items-center justify-between">
                       <div className="space-y-1">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Archive className="w-4 h-4 text-primary" /> Workflow Phase
                        </h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                          {event.albumStatus || "New Selection"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full text-[9px] font-bold uppercase tracking-widest h-8" onClick={() => updateStatus("Completed")}>
                        Mark Done
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 ml-1">
                      <LinkIcon className="w-3 h-3" /> Designer Portal Security Token
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-80 text-primary/80 font-mono flex items-center">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/album/{event.albumLinkToken}
                      </div>
                      <Button 
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-bold gap-2" 
                        onClick={() => handleCopyLink(`${window.location.origin}/album/${event.albumLinkToken}`)}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Link
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button 
                      variant="outline" 
                      className="h-11 rounded-xl border-border/50 font-bold gap-2 text-xs flex-1"
                      onClick={generateAlbumPackage}
                      disabled={isGenerating}
                    >
                      <History className="w-4 h-4" /> Regenerate Token
                    </Button>
                    <Link href={`/album/${event.albumLinkToken}`} target="_blank" className="flex-1">
                      <Button variant="outline" className="h-11 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-bold gap-2 text-xs w-full">
                        <Eye className="w-4 h-4" /> View Portal
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl border border-border/20">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
                      <ImageIcon className="w-3 h-3 text-primary" /> {favoritesCount} Selected Masterpieces
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                      {event.items?.filter((i: any) => i.isFavorite).slice(0, 10).map((item: any, idx: number) => (
                        <div key={idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-card overflow-hidden bg-muted">
                          <img src={item.url} className="w-full h-full object-cover" alt="Selected" />
                        </div>
                      ))}
                      {favoritesCount > 10 && (
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary ring-2 ring-card">
                          +{favoritesCount - 10}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                   <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Workflow Status</span>
                      <span className="text-primary">{event.albumStatus || 'Idle'}</span>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Selection Analytics</h4>
              <p className="text-[10px] leading-relaxed italic text-muted-foreground">
                Hafash telemetry tracks selection activity in real-time. Use these insights to optimize your studio's fulfillment cycle.
              </p>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-in slide-in-from-left duration-1000" style={{ width: `${(favoritesCount / (event.items?.length || 1)) * 100}%` }} />
              </div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-primary/60">
                {Math.round((favoritesCount / (event.items?.length || 1)) * 100)}% Conversion Rate
              </p>
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 w-20 h-20 text-primary/5 group-hover:scale-110 transition-transform" />
          </Card>
        </div>
      </div>
    </div>
  );
}
