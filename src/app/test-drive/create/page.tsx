"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, type EventCategory } from '@/lib/store';
import { Camera, User, Calendar as CalendarIcon, Mail, Phone, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import Link from 'next/link';

export default function TestDriveCreatePage() {
  const router = useRouter();
  const { addEvent } = useStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    date: '',
    category: 'Wedding' as EventCategory,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate delay
    setTimeout(() => {
      const newId = `test-${Math.random().toString(36).substring(2, 9)}`;
      const newEvent = {
        id: newId,
        title: formData.title,
        clientName: formData.clientName,
        date: formData.date,
        category: formData.category,
        coverImage: `https://picsum.photos/seed/${newId}/1200/800`,
        items: [],
        isLocked: true,
        isPaid: false,
        albumStatus: "New Selection",
        viewCount: 0,
      };

      addEvent(newEvent);
      router.push(`/test-drive/upload/${newId}`);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center gap-6">
        <Link href="/test-drive">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white/5 border border-white/10 hover:bg-primary transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Sparkles className="w-3.5 h-3.5 text-primary" />
             <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Test Creation Flow</span>
           </div>
           <h1 className="text-4xl font-headline font-bold tracking-tight text-white">Create Test Event</h1>
        </div>
      </div>

      <div className="bg-card/30 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-10 lg:p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
        
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Event Master Title</Label>
            <div className="relative group">
              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:scale-110 transition-transform" />
              <Input 
                placeholder="e.g. Cinematic Wedding of Ahmed & Fatima" 
                className="pl-12 h-16 rounded-2xl bg-background/50 border-white/10 focus:border-primary/50 text-lg font-medium shadow-inner"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Premium Client Name</Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:scale-110 transition-transform" />
                <Input 
                  placeholder="Full Legal Name" 
                  className="pl-12 h-16 rounded-2xl bg-background/50 border-white/10 focus:border-primary/50 text-lg shadow-inner"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Visual Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({ ...formData, category: val as EventCategory })}
              >
                <SelectTrigger className="h-16 rounded-2xl bg-background/50 border-white/10 focus:border-primary/50 text-lg shadow-inner">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Mehndi">Mehndi</SelectItem>
                  <SelectItem value="Barat">Barat</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Primary Event Date</Label>
            <div className="relative group">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:scale-110 transition-transform" />
              <Input 
                type="date"
                className="pl-12 h-16 rounded-2xl bg-background/50 border-white/10 focus:border-primary/50 text-lg shadow-inner"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-8">
            <Button type="submit" className="w-full h-20 bg-primary text-primary-foreground hover:bg-primary/90 text-xl font-bold rounded-3xl shadow-[0_30px_60px_rgba(212,175,55,0.2)] transition-all hover:translate-y-[-4px] active:scale-95" disabled={loading}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3" />}
              {loading ? "Initializing Workspace..." : "Create Test Workspace"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
