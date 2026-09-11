"use client";

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { 
  Plus, 
  LayoutGrid, 
  Camera, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Heart, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function TestDriveDashboard() {
  const { events } = useStore();

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Test Mode Banner */}
      <div className="bg-primary/10 border border-primary/30 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="bg-primary/20 p-4 rounded-2xl ring-4 ring-primary/5">
            <Info className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold">Interactive Sandbox Mode</h2>
            <p className="text-sm text-muted-foreground">Test the full Hafash workflow. These events exist only in your browser session.</p>
          </div>
        </div>
        <Link href="/test-drive/create">
          <Button className="rounded-full bg-primary text-primary-foreground font-bold px-8 h-12 shadow-lg shadow-primary/20">
            Create Your First Test Event
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Test Studio</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-headline font-bold tracking-tight text-white drop-shadow-2xl">
            Test <span className="text-primary italic">Dashboard</span>
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Test Events</p>
              <p className="text-3xl font-headline font-bold text-primary">{events.length}</p>
           </div>
           <div className="bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Cloud Assets</p>
              <p className="text-3xl font-headline font-bold text-primary">
                {events.reduce((acc, e) => acc + e.items.length, 0)}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {events.length === 0 ? (
          <div className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-card/10">
            <Camera className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-headline font-bold mb-2">Your test studio is empty</h3>
            <p className="text-muted-foreground italic mb-10">Create an event to start exploring the delivery flow.</p>
            <Link href="/test-drive/create">
              <Button size="lg" className="rounded-full bg-primary font-bold px-12 h-14">Get Started</Button>
            </Link>
          </div>
        ) : (
          events.map(event => (
            <Card key={event.id} className="group relative overflow-hidden rounded-[2.5rem] border-white/5 bg-card/30 hover:border-primary/40 transition-all duration-700 shadow-2xl hover:translate-y-[-8px]">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img src={event.coverImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={event.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                <div className="absolute bottom-6 left-8 right-8">
                  <Badge className="bg-primary/20 text-primary border border-primary/30 mb-4 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                    {event.category}
                  </Badge>
                  <h3 className="text-2xl font-headline font-bold text-white tracking-tight line-clamp-1">{event.title}</h3>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="flex items-center gap-3"><UserIcon className="w-4 h-4 text-primary" /> {event.clientName}</span>
                  <span className="flex items-center gap-3"><CalendarIcon className="w-4 h-4 text-primary" /> {event.date}</span>
                </div>
                
                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Assets</span>
                     <span className="text-xs font-medium text-white/80">{event.items.length} Delivered</span>
                   </div>
                   <Link href={`/test-drive/manage/${event.id}`}>
                      <Button variant="ghost" size="sm" className="h-10 rounded-xl px-5 gap-2 text-[10px] font-bold uppercase hover:bg-primary/10">
                        Manage <ArrowRight className="w-4 h-4" />
                      </Button>
                   </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
