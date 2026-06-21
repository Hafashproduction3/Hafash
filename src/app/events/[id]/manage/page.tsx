
"use client";

import { useStore } from '@/lib/store';
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
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function EventManagementPage() {
  const { id } = useParams() as { id: string };
  const { events, toggleLock, deleteEvent } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  
  const event = events.find(e => e.id === id);

  if (!event) return <div>Event not found.</div>;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/gallery/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Gallery link copied to clipboard." });
  };

  const handleWhatsAppShare = () => {
    const url = `${window.location.origin}/gallery/${id}`;
    const text = `Check out your luxury gallery: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      deleteEvent(id);
      router.push('/dashboard');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-headline font-bold">{event.title}</h1>
            <p className="text-muted-foreground">Manage gallery access and sharing.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/gallery/${id}`} target="_blank">
             <Button variant="outline" className="rounded-full gap-2 border-primary text-primary hover:bg-primary/10">
               <Eye className="w-4 h-4" /> Preview
             </Button>
          </Link>
          <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete}>
             <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sharing Card */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Delivery Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Gallery Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm truncate opacity-60">
                    {window.location.origin}/gallery/{id}
                  </div>
                  <Button size="icon" className="rounded-xl bg-primary text-primary-foreground" onClick={handleCopyLink}>
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-3" onClick={handleWhatsAppShare}>
                  <MessageCircle className="w-5 h-5" /> Share via WhatsApp
                </Button>
                <Button className="h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-3" onClick={handleCopyLink}>
                  <LinkIcon className="w-5 h-5" /> Copy Gallery Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Access Control Card */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Download Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center justify-between p-6 bg-background rounded-2xl border border-border/30">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    {event.isLocked ? <Lock className="w-4 h-4 text-destructive" /> : <Unlock className="w-4 h-4 text-green-500" />}
                    Client Downloads
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {event.isLocked 
                      ? "Watermarks are active. Clients cannot download original files." 
                      : "Watermarks are hidden. Original files are ready for download."}
                  </p>
                </div>
                <Switch 
                  checked={!event.isLocked} 
                  onCheckedChange={() => toggleLock(id)} 
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Items</p>
                   <p className="text-2xl font-headline font-bold">{event.items.length}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Views</p>
                   <p className="text-2xl font-headline font-bold">{event.viewCount}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-border/30 bg-background/30">
                   <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Favorites</p>
                   <p className="text-2xl font-headline font-bold text-primary">{event.items.filter(i => i.isFavorite).length}</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Quick Actions */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link href={`/events/${id}/upload`} className="block">
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary rounded-xl h-12">
                  <span className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /> Add Media</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary rounded-xl h-12">
                <span className="flex items-center gap-3"><SettingsIcon className="w-4 h-4" /> Edit Event Info</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Cover Photo Selection (Simulated) */}
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-background/30">
              <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Cover Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <img src={event.coverImage} alt="Cover" className="w-full aspect-video object-cover" />
              <div className="p-4">
                <Button variant="outline" size="sm" className="w-full rounded-xl border-border/50">Change Cover Photo</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
