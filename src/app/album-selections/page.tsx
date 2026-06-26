
"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { BookOpen, Calendar, User, CheckCircle2, Link as LinkIcon, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';

export default function AlbumSelectionsPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

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

  const selections = useMemo(() => {
    if (!galleries) return [];
    return galleries.filter(g => g.items && g.items.some((i: any) => i.isFavorite));
  }, [galleries]);

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Syncing album selections...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold">Album Selections</h1>
        <p className="text-muted-foreground mt-2">Manage curated client masterpieces for physical album production.</p>
      </div>

      {selections.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-20 text-center">
          <CardContent>
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">No client selections have been initiated yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {selections.map(selection => {
            const favoritesCount = selection.items.filter((i: any) => i.isFavorite).length;
            const status = selection.albumStatus || "New Selection";
            
            return (
              <Card key={selection.id} className="bg-card border-border/50 overflow-hidden hover:border-primary/30 transition-all">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-48 md:h-auto bg-muted">
                      <img src={selection.coverImage} className="w-full h-full object-cover" alt={selection.title} />
                    </div>
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                              {status}
                            </Badge>
                            {selection.albumLinkEnabled && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-widest bg-green-500/10 text-green-500 border-green-500/20">
                                Link Active
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-2xl font-headline font-bold">{selection.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground text-sm font-medium">
                            <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> {selection.clientName}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {selection.date}</span>
                            <span className="flex items-center gap-1.5 text-primary font-bold">{favoritesCount} Selected Items</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                          <Link href={`/events/${selection.id}/manage`}>
                            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold gap-2">
                              Manage Selection <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                          {selection.albumLinkToken && selection.albumLinkEnabled && (
                            <Link href={`/album/${selection.albumLinkToken}`} target="_blank">
                              <Button variant="outline" className="w-full rounded-full border-border/50 gap-2 font-bold hover:bg-primary/5">
                                <ExternalLink className="w-4 h-4" /> Designer View
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Created: {selection.createdAt || selection.date}</span>
                          {selection.albumLinkCreated && (
                            <span>Link Generated: {new Date(selection.albumLinkCreated).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="italic uppercase tracking-tighter">Hafash Telemetry Sync Active</span>
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
