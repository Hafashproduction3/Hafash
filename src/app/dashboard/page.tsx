
"use client";

import { useStore } from '@/lib/store';
import { 
  Users, 
  Image as ImageIcon, 
  Eye, 
  Plus, 
  MoreVertical, 
  Share2, 
  Trash2, 
  Lock, 
  Unlock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { events, deleteEvent, toggleLock } = useStore();
  const { toast } = useToast();

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/gallery/${id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Gallery link has been copied to clipboard.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold">Studio Overview</h1>
          <p className="text-muted-foreground mt-2">Manage your luxury galleries and clients.</p>
        </div>
        <Link href="/events/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-12 font-bold flex gap-2">
            <Plus className="w-5 h-5" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Galleries" value={events.length.toString()} icon={<ImageIcon className="w-5 h-5 text-primary" />} />
        <StatCard title="Total Clients" value="24" icon={<Users className="w-5 h-5 text-primary" />} />
        <StatCard title="Gallery Views" value="1.2k" icon={<Eye className="w-5 h-5 text-primary" />} />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-headline font-bold border-b border-border/50 pb-4">Recent Events</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden border-border/30 bg-card/50 group hover:border-primary/50 transition-all duration-300">
              <div className="aspect-[16/9] relative overflow-hidden">
                <img 
                  src={event.coverImage} 
                  alt={event.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 ${event.isLocked ? 'bg-destructive/20 text-destructive-foreground border border-destructive/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                    {event.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {event.isLocked ? 'Downloads Locked' : 'Downloads Open'}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-headline font-bold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.clientName} • {event.category} • {event.date}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border/50 text-foreground">
                      <DropdownMenuItem onClick={() => handleShare(event.id)}>
                        <Share2 className="w-4 h-4 mr-2" /> Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleLock(event.id)}>
                        {event.isLocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {event.isLocked ? 'Unlock Downloads' : 'Lock Downloads'}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/events/${event.id}/upload`}>
                          <ImageIcon className="w-4 h-4 mr-2" /> Add Photos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteEvent(event.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" className="flex-1 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/50" asChild>
                    <Link href={`/gallery/${event.id}`}>Preview Gallery</Link>
                  </Button>
                  <Button size="sm" className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold" asChild>
                    <Link href={`/events/${event.id}/manage`}>Manage</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-3xl font-headline font-bold mt-1">{value}</h3>
      </div>
      <div className="p-3 bg-primary/10 rounded-2xl">
        {icon}
      </div>
    </Card>
  );
}
