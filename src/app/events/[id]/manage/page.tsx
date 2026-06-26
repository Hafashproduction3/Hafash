
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
  History
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
        <p className="mt-4 text-muted-foreground">Loading event telemetry...</p>
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
        toast({ title: "Success", description: "Hafash Album Package generated." });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      })
      .finally(() => setIsGenerating(false));
  };

  const toggleAlbumLink = (status: boolean) => {
    if (!firestore || !user || !eventRef) return;
    updateDoc(eventRef, { albumLinkEnabled: !status });
  };

  const handleDelete = () => {
    if (!firestore || !user || !confirm('Are you sure you want to delete this event?')) return;
    deleteDoc(eventRef!)
      .then(() => {
        toast({ title: "Event Deleted" });
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
            <h1 className="text-3xl font-headline font-bold">{event.title}</h1>
            <p className="text-muted-foreground">Master asset management and delivery telemetry.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-full gap-2 border-primary text-primary hover:bg-primary/10">
               <Eye className="w-4 h-4" /> Preview Gallery
             </Button>
          </Link>
          <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete}>
             <Trash2 className="w-4 h-4" /> Delete Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Album Selections Section */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl ring-1 ring-primary/20">
            <CardHeader className="border-b border-border/30 bg-primary/5 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-primary">
                  <BookOpen className="w-5 h-5" /> Album Selections Workflow
                </span>
                <span className="text-[10px] uppercase tracking-widest bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
                  {favoritesCount} Masterpieces Selected
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {!event.albumLinkToken ? (
                <div className="text-center py-8 space-y-6">
                  <div className="bg-background/50 p-6 rounded-2xl border border-border/30 italic text-muted-foreground">
                    "Group and package client favorites into a secure high-resolution workspace for your album designer."
                  </div>
                  <Button 
                    className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 px-10 shadow-lg shadow-primary/20"
                    onClick={generateAlbumPackage}
                    disabled={favoritesCount === 0 || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Generate Album Package
                  </Button>
                  {favoritesCount === 0 && (
                    <p className="text-xs text-destructive font-bold uppercase tracking-widest">Wait for client selection to begin</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-background rounded-2xl border border-border/30">
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold flex items-center gap-2">
                        {event.albumLinkEnabled ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-destructive" />}
                        Secure Designer Link
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {event.albumLinkEnabled ? "Designer has full access to master files." : "Link access is currently restricted."}
                      </p>
                    </div>
                    <Switch 
                      checked={event.albumLinkEnabled} 
                      onCheckedChange={() => toggleAlbumLink(event.albumLinkEnabled)} 
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <LinkIcon className="w-3 h-3" /> Designer Portal URL
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-80 text-primary/80 font-mono">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/album/{event.albumLinkToken}
                      </div>
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="rounded-xl border-primary/30 text-primary hover:bg-primary/10" 
                        onClick={() => handleCopyLink(`${window.location.origin}/album/${event.albumLinkToken}`)}
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-12 rounded-xl border-border/50 font-bold gap-2"
                      onClick={generateAlbumPackage}
                      disabled={isGenerating}
                    >
                      <History className="w-4 h-4" /> Regenerate Secure Token
                    </Button>
                    <Link href={`/album/${event.albumLinkToken}`} target="_blank" className="block w-full">
                      <Button className="h-12 rounded-xl w-full bg-primary text-primary-foreground font-bold gap-2">
                        <Eye className="w-4 h-4" /> View Designer Portal
                      </Button>
                    </Link>
                  </div>

                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    Package Security: Only favorites are visible. Original files are exposed for download.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-border/30 bg-background/30 px-8 py-6">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Delivery Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Client Gallery Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-80 text-primary/80 font-mono">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/gallery/{event.slug || event.id}
                  </div>
                  <Button size="icon" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out your luxury gallery: ${window.location.origin}/gallery/${event.slug || event.id}`)}`, '_blank')}>
                  <MessageCircle className="w-5 h-5" /> Share via WhatsApp
                </Button>
                <Button className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3" onClick={() => handleCopyLink(`${window.location.origin}/gallery/${event.slug || event.id}`)}>
                  <LinkIcon className="w-5 h-5" /> Copy Gallery Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-lg">
            <CardHeader className="border-b border-border/30 bg-background/30 px-6 py-4">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link href={`/events/${id}/upload`} className="block">
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary rounded-xl h-12">
                  <span className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /> Add More Media</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <div className="pt-4 mt-4 border-t border-border/30 px-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Public Downloads</span>
                  <Switch 
                    checked={!event.isLocked} 
                    onCheckedChange={() => updateDoc(eventRef!, { isLocked: !event.isLocked })}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                  Controls if public gallery users can download high-res files.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
