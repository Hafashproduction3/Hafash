
"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { 
  Heart, 
  Download, 
  ExternalLink, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Sparkles,
  Lock,
  ChevronRight,
  Archive,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function FavoritesPanelPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const favoriteEvents = useMemo(() => {
    return (galleries || []).filter(e => e.items && e.items.some((i: any) => i.isFavorite));
  }, [galleries]);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast({ title: "Copied!", description: "Selection link copied to clipboard." });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const updateStatus = (id: string, val: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'galleries', id);
    updateDoc(ref, { albumStatus: val });
    toast({ title: "Status Updated", description: `Selection workflow phase set to: ${val}` });
  };

  const toggleAlbumLink = (id: string, status: boolean) => {
    if (!firestore) return;
    const ref = doc(firestore, 'galleries', id);
    updateDoc(ref, { albumLinkEnabled: !status });
  };

  const generateAlbumPackage = (id: string) => {
    if (!firestore) return;
    setIsGenerating(id);

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const updateData = {
      albumLinkToken: token,
      albumLinkEnabled: true,
      albumLinkCreated: new Date().toISOString(),
      albumStatus: "Album Package Generated"
    };

    const ref = doc(firestore, 'galleries', id);
    updateDoc(ref, updateData)
      .then(() => {
        toast({ title: "Success", description: "Secure Selection Package generated." });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      })
      .finally(() => setIsGenerating(null));
  };

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Syncing Selections...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold">Client Favorites & Workflow</h1>
          <p className="text-muted-foreground mt-2">Manage curated client selections and professional delivery workflow.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Master Asset Workflow Active</span>
        </div>
      </div>

      {favoriteEvents.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
          <CardContent>
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-headline font-bold mb-2">No selections yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto italic">Send your gallery links to clients. When they heart their moments, they will appear here for processing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {favoriteEvents.map(event => {
            const favorites = event.items.filter((i: any) => i.isFavorite);
            const selectionLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/album/${event.albumLinkToken}`;
            
            return (
              <Card key={event.id} className="bg-card border-border/50 overflow-hidden shadow-xl ring-1 ring-primary/5">
                <CardContent className="p-0">
                  <div className="flex flex-col xl:flex-row">
                    {/* Event Info Sidebar */}
                    <div className="w-full xl:w-80 bg-muted/30 p-8 border-b xl:border-b-0 xl:border-r border-border/30 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="aspect-video rounded-2xl overflow-hidden relative shadow-lg">
                          <img src={event.coverImage} className="w-full h-full object-cover" alt={event.title} />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-white tracking-[0.2em]">{event.category}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-headline font-bold mb-2">{event.title}</h3>
                          <div className="space-y-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            <p className="flex items-center gap-2"><Calendar className="w-3 h-3 text-primary" /> {event.date}</p>
                            <p className="flex items-center gap-2 text-primary"><Heart className="w-3 h-3 fill-current" /> {favorites.length} Masterpieces</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-border/20">
                        <Link href={`/events/${event.id}/manage`}>
                          <Button variant="outline" className="w-full rounded-xl border-border/50 hover:bg-primary/5 hover:text-primary gap-2 h-12 text-[10px] font-bold uppercase tracking-widest">
                            <ExternalLink className="w-4 h-4" /> Manage Event
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Workflow Section */}
                    <div className="flex-1 p-8 space-y-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Archive className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Workflow Phase</p>
                            <h4 className="text-sm font-bold">Selection Fulfillment</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:inline">Status:</span>
                          <Select 
                            value={event.albumStatus || "New Selection"} 
                            onValueChange={(val) => updateStatus(event.id, val)}
                          >
                            <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl bg-background border-border/50 font-bold text-[10px] uppercase tracking-wider">
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

                      {!event.albumLinkToken ? (
                        <div className="bg-primary/5 rounded-3xl p-10 text-center border border-primary/10">
                          <BookOpen className="w-10 h-10 text-primary opacity-20 mx-auto mb-4" />
                          <h5 className="font-headline font-bold text-lg mb-2">Initialize Selection Portal</h5>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-8 italic">Create a secure portal for designers or reviewers to access only these {favorites.length} original files.</p>
                          <Button 
                            className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 px-10 shadow-lg shadow-primary/20"
                            onClick={() => generateAlbumPackage(event.id)}
                            disabled={isGenerating === event.id}
                          >
                            {isGenerating === event.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            Generate Selection Link
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-2xl border border-border/30 flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold flex items-center gap-2">
                                  {event.albumLinkEnabled ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-destructive" />}
                                  Portal Access
                                </h4>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                                  {event.albumLinkEnabled ? "Designer Access Active" : "Access Restricted"}
                                </p>
                              </div>
                              <Switch 
                                checked={event.albumLinkEnabled} 
                                onCheckedChange={() => toggleAlbumLink(event.id, event.albumLinkEnabled)} 
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                            
                            <Button 
                              variant="outline" 
                              className="h-auto py-3 rounded-2xl border-border/50 font-bold gap-2 text-xs"
                              onClick={() => generateAlbumPackage(event.id)}
                              disabled={isGenerating === event.id}
                            >
                              <Sparkles className="w-4 h-4 text-primary" /> Regenerate Token
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 ml-1">
                              <LinkIcon className="w-3 h-3" /> Secure Selection Link
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-[10px] truncate opacity-80 text-primary/80 font-mono flex items-center">
                                {selectionLink}
                              </div>
                              <Button 
                                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-bold gap-2" 
                                onClick={() => handleCopyLink(selectionLink, event.id)}
                              >
                                {copiedToken === event.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span className="hidden sm:inline">Copy</span>
                              </Button>
                              <Link href={`/album/${event.albumLinkToken}`} target="_blank">
                                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/50 hover:bg-primary/10">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-6 border-t border-border/20">
                         <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Preview Selected Masterpieces</p>
                         <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                            {favorites.slice(0, 10).map((item: any) => (
                              <div key={item.id} className="aspect-square rounded-xl overflow-hidden border border-border/30 group relative">
                                <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Selected" />
                              </div>
                            ))}
                            {favorites.length > 10 && (
                              <div className="aspect-square rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                +{favorites.length - 10}
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
