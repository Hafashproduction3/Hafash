"use client";

import { useStore } from '@/lib/store';
import { BookOpen, Calendar, User, Clock, ShieldCheck, ArrowLeft, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function TestDriveSelectionsPage() {
  const { events } = useStore();
  const router = useRouter();

  // Only show galleries that have favorites or have an album workflow initiated
  const selections = useMemo(() => {
    return events.filter(g => (Array.isArray(g.items) && g.items.some((i: any) => i.isFavorite)) || g.albumStatus !== "New Selection");
  }, [events]);

  const totalFilesCount = useMemo(() => {
    return selections.reduce((acc, curr) => acc + (Array.isArray(curr.items) ? curr.items.filter((i: any) => i.isFavorite).length : 0), 0);
  }, [selections]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-white">Test Selections</h1>
            <p className="text-muted-foreground mt-2">Manage simulated client selections for production testing.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Local Asset Sync Active</span>
        </div>
      </div>

      {selections.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
          <CardContent>
            <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary opacity-30" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-2 text-white">No test selections</h3>
            <p className="text-muted-foreground max-w-sm mx-auto italic">Favorite photos in a test gallery to see them appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {selections.map(selection => {
            const favoritesCount = Array.isArray(selection.items) 
              ? selection.items.filter((i: any) => i.isFavorite).length 
              : 0;
            const status = selection.albumStatus || "New Selection";
            
            return (
              <Card key={selection.id} className="bg-card/50 border-border/30 overflow-hidden hover:border-primary/40 transition-all group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                    <div className="w-full md:w-32 bg-muted relative overflow-hidden group-hover:opacity-80 transition-opacity">
                      {selection.coverImage && (
                        <img src={selection.coverImage} className="w-full h-full object-cover absolute inset-0" alt={selection.title} />
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
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-headline font-bold text-white group-hover:text-primary transition-colors">{selection.title || "Untitled Test Gallery"}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-1 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-primary" /> {selection.clientName}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {selection.date}</span>
                            <span className="flex items-center gap-1.5 text-primary"><Clock className="w-3 h-3" /> {favoritesCount} Selections</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link href={`/test-drive/selections/${selection.id}/details`} className="flex-1 md:flex-none">
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2 h-12 px-6">
                            Open Selections <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/test-drive/manage/${selection.id}`} title="Manage Event">
                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50 hover:bg-primary/10 text-white">
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
          <h4 className="font-headline font-bold text-lg text-white">Simulation Architecture</h4>
          <p className="text-sm text-muted-foreground">Tracking real-time favorites in your test drive session.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-primary">{selections.length}</p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Projects</p>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-primary">{totalFilesCount}</p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Total Files</p>
          </div>
        </div>
      </div>
    </div>
  );
}