"use client";

import { useStore } from '@/lib/store';
import { HardDrive, Check, ShieldCheck, Activity, ArrowLeft, ImageIcon, FolderOpen, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function TestDriveStoragePage() {
  const { events } = useStore();
  const router = useRouter();

  const stats = useMemo(() => {
    const photoCount = events.reduce((acc, e) => acc + (e.items?.length || 0), 0);
    const sizeMb = photoCount * 12.5; // Simulated 12.5MB per photo
    return {
      photoCount,
      sizeGb: sizeMb / 1024,
      limitGb: 50,
      percent: Math.min((sizeMb / (50 * 1024)) * 100, 100)
    };
  }, [events]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full text-white" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-5xl font-headline font-bold text-white">Test Quotas</h1>
            <p className="text-muted-foreground mt-2 italic text-lg">Simulated infrastructure limits for Test Drive.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Sandbox Environment Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
          <CardHeader className="bg-background/30 border-b border-border/30 p-8">
            <CardTitle className="flex items-center gap-4 text-2xl font-headline font-bold text-white">
              <HardDrive className="w-8 h-8 text-primary" />
              Utilization Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Active Simulation</p>
                <h3 className="text-4xl font-headline font-bold text-primary">Test Tier</h3>
              </div>
              <div className="text-right space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Local Capacity</p>
                <h3 className="text-4xl font-headline font-bold text-white">{stats.limitGb} GB</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/40 p-4 rounded-2xl border border-border/20 flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Photos</p>
                  <p className="text-xl font-bold text-white">{stats.photoCount}</p>
                </div>
              </div>
              <div className="bg-background/40 p-4 rounded-2xl border border-border/20 flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Galleries</p>
                  <p className="text-xl font-bold text-white">{events.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
                <span className="text-white">{stats.sizeGb.toFixed(2)} GB Simulated</span>
                <span className="text-primary">{Math.max(stats.limitGb - stats.sizeGb, 0).toFixed(2)} GB Free</span>
              </div>
              <div className="h-4 w-full bg-background rounded-full overflow-hidden border border-border/50 p-1">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.percent}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-8 flex flex-col justify-center text-center space-y-6">
           <Globe className="w-12 h-12 text-primary mx-auto opacity-20" />
           <h4 className="text-xl font-headline font-bold text-white">Full Parity</h4>
           <p className="text-sm text-muted-foreground leading-relaxed">
             This dashboard correctly calculates storage consumption based on your simulated uploads.
           </p>
           <Button className="rounded-2xl h-14 font-bold bg-primary text-primary-foreground" onClick={() => router.push('/test-drive')}>
             Back to Console
           </Button>
        </Card>
      </div>
    </div>
  );
}