"use client";

import { useStore } from '@/lib/store';
import { User, Shield, Camera, Save, Briefcase, Phone, Settings, Bell, HardDrive, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function TestDriveSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    studioName: 'Test Studio',
    photographerName: 'Principal Artist',
    whatsappNumber: '+923000000000',
    defaultWatermark: true,
    defaultAllowDownloads: false,
  });

  const handleSave = () => {
    toast({ title: "Simulation Success", description: "Studio configuration updated in session." });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-border/50 pb-12">
        <div>
          <h1 className="text-4xl lg:text-5xl font-headline font-bold tracking-tight text-white">Test Settings</h1>
          <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-bold">Configure your simulated studio environment.</p>
        </div>
        <Button className="w-full md:w-auto rounded-2xl gap-3 px-10 h-14 font-bold bg-primary text-primary-foreground" onClick={handleSave}>
          <Save className="w-5 h-5" />
          Synchronize Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-border/30 bg-background/40 p-10">
            <CardTitle className="text-2xl font-headline font-bold text-white flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-primary" /> Studio Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legal Studio Name</Label>
              <Input 
                value={formData.studioName} 
                onChange={(e) => setFormData({...formData, studioName: e.target.value})}
                className="rounded-xl h-12 bg-background/50 border-border/50 text-white" 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">WhatsApp Contact</Label>
              <Input 
                value={formData.whatsappNumber} 
                onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                className="rounded-xl h-12 bg-background/50 border-border/50 text-white" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-border/30 bg-background/40 p-10">
            <CardTitle className="text-2xl font-headline font-bold text-white flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" /> Global Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
               <div>
                 <p className="text-sm font-bold text-white">Dynamic Watermark</p>
                 <p className="text-[9px] text-muted-foreground uppercase">Enable for all new events.</p>
               </div>
               <Switch checked={formData.defaultWatermark} onCheckedChange={(val) => setFormData({...formData, defaultWatermark: val})} className="data-[state=checked]:bg-primary" />
            </div>
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
               <div>
                 <p className="text-sm font-bold text-white">Universal Downloads</p>
                 <p className="text-[9px] text-muted-foreground uppercase">Unlock high-res by default.</p>
               </div>
               <Switch checked={formData.defaultAllowDownloads} onCheckedChange={(val) => setFormData({...formData, defaultAllowDownloads: val})} className="data-[state=checked]:bg-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}