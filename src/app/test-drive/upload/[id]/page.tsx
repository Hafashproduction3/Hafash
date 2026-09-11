"use client";

import { useStore } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';
import { 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  X, 
  ImageIcon,
  Zap,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function TestDriveUploadPage() {
  const params = useParams();
  const id = params?.id as string;
  const { events, addItems } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  
  const event = useMemo(() => events.find(e => e.id === id), [events, id]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  if (!event) return null;

  const simulateUpload = () => {
    setUploading(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setDone(true);
          
          // Add 5 random mock images
          const newItems = Array.from({ length: 5 }).map((_, i) => ({
            id: `test-item-${Math.random().toString(36).substring(2, 9)}`,
            url: `https://picsum.photos/seed/${Math.random()}/1200/1600`,
            type: 'image' as const,
            isFavorite: false,
            fileName: `sample-shot-0${i+1}.jpg`
          }));
          
          addItems(id, newItems);
          toast({ title: "Test Delivery Successful", description: "5 assets synchronized with the local studio vault." });
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center gap-6">
          <Link href={`/test-drive/manage/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white/5 border border-white/10 hover:bg-primary transition-all">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Mock Delivery Hub</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{event.category}</span>
            </div>
            <h1 className="text-4xl font-headline font-bold text-white">{event.title}</h1>
          </div>
        </div>
        
        <div className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/20 flex items-center gap-4">
           <HardDrive className="w-5 h-5 text-primary" />
           <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Test Quota</p>
              <p className="text-xs font-bold font-mono">{(event.items.length * 12.5).toFixed(1)} MB / 50 GB</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <div 
            className={cn(
              "relative h-[450px] border-2 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center transition-all duration-700 shadow-2xl bg-card/30 group overflow-hidden",
              done ? "border-green-500/30" : "border-white/10 hover:border-primary/40 cursor-pointer"
            )}
            onClick={() => !uploading && !done && simulateUpload()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className={cn(
              "p-10 rounded-full mb-8 transition-all duration-700 ring-8",
              done ? "bg-green-500/10 ring-green-500/5 scale-110" : "bg-primary/10 ring-primary/5 group-hover:scale-110"
            )}>
              {done ? <CheckCircle2 className="w-16 h-16 text-green-500" /> : <Upload className="w-16 h-16 text-primary" />}
            </div>
            
            <div className="text-center space-y-3 relative z-10 px-8">
              <p className="text-3xl font-headline font-bold text-white">
                {uploading ? "Synchronizing Vault..." : done ? "Delivery Complete" : "Deliver Masterpieces"}
              </p>
              <p className="text-muted-foreground font-medium italic">
                {uploading ? `Transferring visual assets: ${progress}%` : done ? "Assets are now live in the test gallery" : "Click to simulate high-speed asset synchronization"}
              </p>
            </div>
            
            {uploading && (
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-background/50">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}

            {!uploading && !done && (
               <div className="absolute bottom-10 flex items-center gap-3 px-6 py-2 rounded-full bg-background/50 backdrop-blur-md border border-white/5">
                 <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Direct Studio Channel Active</span>
               </div>
            )}
          </div>

          {done && (
            <div className="flex justify-center animate-in zoom-in-95 duration-500">
               <Link href={`/test-drive/manage/${id}`}>
                 <Button className="rounded-2xl font-bold gap-4 px-12 h-16 bg-white text-black hover:bg-gray-100 shadow-2xl text-lg hover:translate-y-[-4px] transition-all">
                   Manage Event Workspace <ArrowRight className="w-6 h-6" />
                 </Button>
               </Link>
            </div>
          )}
        </div>

        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 h-full min-h-[500px] flex flex-col shadow-2xl overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8">
              <Badge className="bg-primary/20 text-primary border border-primary/30 px-4 py-1 text-[10px] font-bold tracking-[0.2em]">{event.items.length} ASSETS</Badge>
           </div>
           
           <h3 className="text-2xl font-headline font-bold flex items-center gap-4 mb-10 text-white">
             <Sparkles className="w-8 h-8 text-primary" /> Active Pipeline
           </h3>

           <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
             {event.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 text-sm italic text-center px-6">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                  Waiting for test asset selection...
                </div>
             ) : (
               event.items.map((item, idx) => (
                 <div key={item.id} className="bg-background/40 p-5 rounded-2xl border border-white/5 flex gap-5 items-center transition-all hover:border-primary/20">
                    <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={item.url} className="h-full w-full object-cover" alt="Thumb" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-white truncate">{item.fileName || `sample-shot-0${idx+1}.jpg`}</p>
                       <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter mt-1">Verified Live</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                 </div>
               ))
             )}
           </div>

           <div className="mt-10 pt-10 border-t border-white/5 flex flex-col gap-5 opacity-60">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span className="flex items-center gap-2">Protocol</span>
                 <span className="font-mono text-primary">HAFASH-X-SANDBOX</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span className="flex items-center gap-2">Integrity</span>
                 <span className="text-green-500">SECURE-GUEST</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
