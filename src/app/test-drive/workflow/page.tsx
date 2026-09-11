"use client";

import { useStore } from '@/lib/store';
import { 
  Heart, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Sparkles,
  Lock,
  Archive,
  BookOpen,
  ArrowLeft,
  ExternalLink
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
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TestDriveWorkflowPage() {
  const { events, updateEvent } = useStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const favoriteEvents = useMemo(() => {
    return events.filter(e => e.items && e.items.some((i: any) => i.isFavorite));
  }, [events]);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast({ title: "Copied!", description: "Test selection link copied to clipboard." });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const updateStatus = (id: string, val: string) => {
    updateEvent(id, { albumStatus: val });
    toast({ title: "Status Updated", description: `Test phase set to: ${val}` });
  };

  const toggleAlbumLink = (id: string, current: boolean) => {
    updateEvent(id, { albumLinkEnabled: !current });
  };

  const generateAlbumPackage = (id: string) => {
    setIsGenerating(id);

    setTimeout(() => {
      const token = Math.random().toString(36).substring(2, 15);
      updateEvent(id, {
        albumLinkToken: token,
        albumLinkEnabled: true,
        albumLinkCreated: new Date().toISOString(),
        albumStatus: "Album Package Generated"
      });
      toast({ title: "Success", description: "Test Selection Portal generated." });
      setIsGenerating(null);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full text-white" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-white">Workflow Portal</h1>
            <p className="text-muted-foreground mt-2">Manage simulated client curation and fulfillment.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Test Workflow Active</span>
        </div>
      </div>

      {favoriteEvents.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
          <CardContent>
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-headline font-bold mb-2 text-white">No favorites yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto italic">Go to Public View of a test gallery and heart some photos to test this portal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {favoriteEvents.map(event => {
            const favorites = event.items.filter((i: any) => i.isFavorite);
            const selectionLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/test-drive/album/${event.albumLinkToken || 'pending'}`;
            
            return (
              <Card key={event.id} className="bg-card border-border/50 overflow-hidden shadow-xl ring-1 ring-primary/5">
                <CardContent className="p-0">
                  <div className="flex flex-col xl:flex-row">
                    {/* Sidebar */}
                    <div className="w-full xl:w-80 bg-muted/30 p-8 border-b xl:border-b-0 xl:border-r border-border/30">
                      <div className="space-y-6">
                        <div className="aspect-video rounded-2xl overflow-hidden relative shadow-lg">
                          {event.coverImage ? (
                            <img src={event.coverImage} className="w-full h-full object-cover" alt={event.title} />
                          ) : null}
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-headline font-bold mb-2 text-white">{event.title}</h3>
                          <div className="space-y-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            <p className="flex items-center gap-2"><Calendar className="w-3 h-3 text-primary" /> {event.date}</p>
                            <p className="flex items-center gap-2 text-primary"><Heart className="w-3 h-3 fill-current" /> {favorites.length} Selections</p>
                          </div>
                        </div>

                        <Link href={`/test-drive/manage/${event.id}`} className="block">
                          <Button variant="outline" className="w-full rounded-xl border-border/50 text-white hover:bg-primary/5 gap-2 h-12 text-[10px] font-bold uppercase tracking-widest">
                             Manage Event
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 space-y-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Archive className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Workflow Phase</p>
                            <h4 className="text-sm font-bold text-white">Simulation Phase</h4>
                          </div>
                        </div>

                        <Select 
                          value={event.albumStatus || "New Selection"} 
                          onValueChange={(val) => updateStatus(event.id, val)}
                        >
                          <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl bg-background border-border/50 font-bold text-[10px] uppercase tracking-wider text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/50 text-white">
                            <SelectItem value="New Selection" className="text-[10px] uppercase font-bold">New Selection</SelectItem>
                            <SelectItem value="Album Package Generated" className="text-[10px] uppercase font-bold">Package Generated</SelectItem>
                            <SelectItem value="Shared with Album Designer" className="text-[10px] uppercase font-bold">In Production</SelectItem>
                            <SelectItem value="Completed" className="text-[10px] uppercase font-bold text-green-500">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {!event.albumLinkToken ? (
                        <div className="bg-primary/5 rounded-3xl p-10 text-center border border-primary/10">
                          <BookOpen className="w-10 h-10 text-primary opacity-20 mx-auto mb-4" />
                          <h5 className="font-headline font-bold text-lg mb-2 text-white">Simulate Selection Portal</h5>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-8 italic">Create a secure link for designers to access these selections.</p>
                          <Button 
                            className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3 px-10"
                            onClick={() => generateAlbumPackage(event.id)}
                            disabled={isGenerating === event.id}
                          >
                            {isGenerating === event.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            Generate Link
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-2xl border border-border/30 flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                  {event.albumLinkEnabled ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-destructive" />}
                                  Access State
                                </h4>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                                  {event.albumLinkEnabled ? "Link Is Active" : "Link Disabled"}
                                </p>
                              </div>
                              <Switch 
                                checked={event.albumLinkEnabled} 
                                onCheckedChange={() => toggleAlbumLink(event.id, !!event.albumLinkEnabled)} 
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                            
                            <Button 
                              variant="outline" 
                              className="h-auto py-3 rounded-2xl border-border/50 font-bold gap-2 text-xs text-white"
                              onClick={() => generateAlbumPackage(event.id)}
                              disabled={isGenerating === event.id}
                            >
                              <Sparkles className="w-4 h-4 text-primary" /> Rotate Token
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 ml-1">
                              <LinkIcon className="w-3 h-3" /> Selection Link
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-[10px] truncate text-primary/80 font-mono flex items-center">
                                {selectionLink}
                              </div>
                              <Button 
                                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-bold" 
                                onClick={() => handleCopyLink(selectionLink, event.id)}
                              >
                                {copiedToken === event.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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