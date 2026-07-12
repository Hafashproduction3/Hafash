"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { BookOpen, Calendar, User, CheckCircle2, Link as LinkIcon, ExternalLink, Loader2, ArrowRight, Clock, ShieldCheck, ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function AlbumSelectionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  // Only show galleries that have favorites or have an album workflow initiated
  const selections = useMemo(() => {
    if (!galleries || !Array.isArray(galleries)) return [];
    return galleries.filter(g => (Array.isArray(g.items) && g.items.some((i: any) => i.isFavorite)) || g.albumStatus);
  }, [galleries]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold">Album Selections</h1>
            <p className="text-muted-foreground mt-2">Manage curated client selections for professional production.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Master Asset Sync Active</span>
        </div>
      </div>

      {dataLoading && !galleries ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : selections.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
          <CardContent>
            <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary opacity-30" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-2">No active selections</h3>
            <p className="text-muted-foreground max-w-sm mx-auto italic">When a client favorites photos in their gallery, they will automatically appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {selections.map(selection => {
            const favoritesCount = Array.isArray(selection.items) 
              ? selection.items.filter((i: any) => i.isFavorite).length 
              : 0;
            const status = selection.albumStatus || "New Selection";
            const lastUpdated = selection.updatedAt || selection.createdAt;
            
            return (
              <Card key={selection.id} className="bg-card/50 border-border/30 overflow-hidden hover:border-primary/40 transition-all group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                    <div className="w-full md:w-32 bg-muted relative overflow-hidden group-hover:opacity-80 transition-opacity">
                      {selection.coverImage && (
                        <img src={selection.coverImage} className="w-full h-full object-cover absolute inset-0" alt={selection.title || "Gallery"} />
                      )}
                      <div className="absolute inset-0 bg-black/40 md:hidden" />
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={cn(
                              "text-[9px] uppercase tracking-widest px-3 py-1 font-bold",
                              status === "Completed" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : 
                              status === "Album Package Generated" ? "bg-primary/20 text-primary hover:bg-primary/30" :
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {status}
                          </Badge>
                          {lastUpdated && (
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                              Last Updated: {format(new Date(lastUpdated), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-headline font-bold group-hover:text-primary transition-colors">{selection.title || "Untitled Gallery"}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-primary" /> {selection.clientName || "Unknown Client"}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {selection.date || "N/A"}</span>
                            <span className="flex items-center gap-1.5 text-primary"><Clock className="w-3 h-3" /> {favoritesCount} Selections</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link href={`/album-selections/${selection.id}/details`} className="flex-1 md:flex-none">
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2 h-12 px-6">
                            Open Selections <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/events/${selection.id}/manage`} title="Manage Event">
                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50 hover:bg-primary/10">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="bg-card/30 border border-border/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="font-headline font-bold text-lg">Selection Architecture</h4>
          <p className="text-sm text-muted-foreground">This dashboard tracks real-time client favorites from your public galleries.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-primary">{dataLoading && !galleries ? '...' : selections.length}</p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Projects</p>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-primary">
              {dataLoading && !galleries ? '...' : selections.reduce((acc, curr) => acc + (Array.isArray(curr.items) ? curr.items.filter((i: any) => i.isFavorite).length : 0), 0)}
            </p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Total Files</p>
          </div>
        </div>
      </div>
    </div>
  );
}