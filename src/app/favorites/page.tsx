
"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { Heart, Download, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';

export default function FavoritesPanelPage() {
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

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading favorites...</p>
      </div>
    );
  }

  if (!user) return null;

  const favoriteEvents = (galleries || []).filter(e => e.items && e.items.some((i: any) => i.isFavorite));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold">Client Favorites</h1>
        <p className="text-muted-foreground mt-2">Selection panel for albums currently being curated by clients.</p>
      </div>

      {favoriteEvents.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-border/50 py-20 text-center">
          <CardContent>
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">No client selections yet. Send your gallery links to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {favoriteEvents.map(event => {
            const favorites = event.items.filter((i: any) => i.isFavorite);
            return (
              <Card key={event.id} className="bg-card border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    <div className="w-full lg:w-72 h-48 lg:h-auto bg-muted">
                      <img src={event.coverImage} className="w-full h-full object-cover" alt={event.title} />
                    </div>
                    <div className="flex-1 p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                          <h3 className="text-2xl font-headline font-bold">{event.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm">
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {event.date}</span>
                            <span className="flex items-center gap-1 font-bold text-primary"><Heart className="w-4 h-4 fill-current" /> {favorites.length} Selected</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10 gap-2">
                            <Download className="w-4 h-4" /> Export List
                          </Button>
                          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full gap-2" asChild>
                            <Link href={`/events/${event.id}/manage`}><ExternalLink className="w-4 h-4" /> Manage Event</Link>
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {favorites.slice(0, 16).map((item: any) => (
                          <div key={item.id} className="aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-primary transition-colors">
                            <img src={item.url} className="w-full h-full object-cover" alt="Selected" />
                          </div>
                        ))}
                        {favorites.length > 16 && (
                          <div className="aspect-square rounded-lg bg-background/50 border border-border/30 flex items-center justify-center text-sm font-bold text-muted-foreground">
                            +{favorites.length - 16} More
                          </div>
                        )}
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
