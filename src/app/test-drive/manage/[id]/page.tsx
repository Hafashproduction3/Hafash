"use client";

import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { 
  Trash2, 
  Image as ImageIcon,
  ArrowLeft,
  Eye,
  Loader2,
  Sparkles,
  Camera,
  Copy,
  Check,
  LayoutGrid,
  User,
  Calendar,
  Archive,
  ExternalLink,
  Zap,
  ShieldCheck,
  HardDrive,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function TestDriveManagementPage() {
  const params = useParams();
  const id = params?.id as string;
  const { events, updateEvent, deleteEvent } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  
  const event = useMemo(() => events.find(e => e.id === id), [events, id]);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!event) {
    return (
      <div className="text-center py-40 animate-in fade-in duration-700">
        <h2 className="text-4xl font-headline font-bold text-white mb-8">Test Event Not Found</h2>
        <Link href="/test-drive"><Button className="rounded-2xl h-14 px-10">Return to Dashboard</Button></Link>
      </div>
    );
  }

  const handleToggle = (field: string, val: boolean) => {
    updateEvent(id, { [field]: val });
    toast({ title: "Configuration Updated", description: `${field} status has been synchronized.` });
  };

  const handleCopy = () => {
    const url = `${window.location.origin}/test-drive/gallery/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast({ title: "Public Link Copied" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = () => {
    deleteEvent(id);
    toast({ title: "Test Event Purged" });
    router.push('/test-drive');
  };

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Hero Management Card */}
      <div className="relative rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/95 to-background z-0" />
        <div className="relative z-10 p-12 lg:p-20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <Link href="/test-drive">
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white/5 border border-white/10 hover:bg-primary transition-all">
                  <ArrowLeft className="w-6 h-6" />
                </Button>
              </Link>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-[0.4em] px-6 py-2 rounded-xl backdrop-blur-md">
                Test Mode / {event.category}
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl lg:text-7xl font-headline font-bold tracking-tighter text-white leading-none">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-10 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">
                <span className="flex items-center gap-3"><User className="w-4 h-4 text-primary" /> {event.clientName}</span>
                <span className="flex items-center gap-3"><Calendar className="w-4 h-4 text-primary" /> {event.date}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
            <Link href={`/test-drive/gallery/${id}`} target="_blank" className="flex-1">
               <Button className="w-full rounded-[1.5rem] h-20 bg-white text-black hover:bg-gray-100 font-bold gap-4 shadow-2xl transition-all hover:translate-y-[-4px] text-lg">
                 <Eye className="w-7 h-7" /> Preview
               </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1 rounded-[1.5rem] h-20 border-white/10 font-bold gap-4 bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all hover:translate-y-[-4px] shadow-2xl text-lg"
              onClick={handleCopy}
            >
              {copiedLink ? <Check className="w-7 h-7 text-green-500" /> : <Copy className="w-7 h-7" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Visual Assets Preview */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/5 border-b border-white/5 px-10 py-10 flex flex-row items-center justify-between">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-6 text-white">
                <ImageIcon className="w-8 h-8 text-primary" /> Studio Assets
              </CardTitle>
              <Link href={`/test-drive/upload/${id}`}>
                <Button className="rounded-2xl bg-primary text-primary-foreground font-bold gap-3 h-14 px-8 shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px]">
                  <ImageIcon className="w-5 h-5" /> Add Test Photos
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-10">
              {event.items.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-background/20">
                  <LayoutGrid className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
                  <p className="text-muted-foreground italic font-headline text-xl">Waiting for your visual masterpieces...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {event.items.map(item => (
                    <div key={item.id} className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                      <img src={item.url} className="w-full h-full object-cover" alt="Thumb" />
                      {item.isFavorite && (
                         <div className="absolute top-4 right-4 bg-primary text-primary-foreground p-1.5 rounded-full shadow-2xl">
                           <Heart className="w-3 h-3 fill-current" />
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Strategy */}
          <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/5 border-b border-white/5 px-10 py-10">
              <CardTitle className="text-3xl font-headline font-bold flex items-center gap-6 text-white">
                <Sparkles className="w-8 h-8 text-primary" /> Workflow Phase
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
               <div className="flex flex-col md:flex-row items-center gap-8 justify-between bg-background/40 p-8 rounded-3xl border border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Current Status</p>
                    <p className="text-2xl font-headline font-bold text-primary">{event.albumStatus || "New Selection"}</p>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" className="rounded-xl border-white/10 font-bold" onClick={() => updateEvent(id, { albumStatus: 'In Production' })}>In Production</Button>
                    <Button className="rounded-xl bg-primary font-bold" onClick={() => updateEvent(id, { albumStatus: 'Completed' })}>Mark Completed</Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Center */}
        <div className="space-y-12">
           <Card className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl border-t-4 border-t-primary">
            <CardHeader className="p-10 border-b border-white/5 bg-background/20">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.5em] text-primary flex items-center gap-3">
                <Zap className="w-4 h-4 animate-pulse" /> Control Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-8">
                <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-[0.2em] block">Download Access</span>
                    <p className="text-[10px] text-muted-foreground">Enable high-res originals</p>
                  </div>
                  <Switch checked={event.isPaid} onCheckedChange={(val) => handleToggle('isPaid', val)} className="data-[state=checked]:bg-primary" />
                </div>
                
                <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-[0.2em] block">Privacy Lock</span>
                    <p className="text-[10px] text-muted-foreground">Toggle studio credentials</p>
                  </div>
                  <Switch checked={event.isLocked} onCheckedChange={(val) => handleToggle('isLocked', val)} className="data-[state=checked]:bg-primary" />
                </div>
              </div>

              <div className="pt-10 border-t border-white/5 space-y-6">
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-3">
                   <div className="flex items-center gap-3">
                     <ShieldCheck className="w-4 h-4 text-primary" />
                     <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Revenue Simulation</span>
                   </div>
                   <p className="text-xs text-muted-foreground">Marking an event as "Paid" automatically unlocks full downloads for the client gallery.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border border-destructive/20 rounded-[3rem] overflow-hidden shadow-2xl">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-lg font-headline font-bold text-destructive flex items-center gap-4">
                <Trash2 className="w-6 h-6" /> Permanent Removal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <Button variant="destructive" className="w-full rounded-2xl font-bold h-16 text-[11px] uppercase tracking-[0.4em]" onClick={handleDelete}>
                Destroy Test Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
