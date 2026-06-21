
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, EventCategory } from '@/lib/store';
import { Calendar as CalendarIcon, User, Camera, ArrowLeft } from 'lucide-react';
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

export default function CreateEventPage() {
  const router = useRouter();
  const { addEvent } = useStore();
  
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    date: '',
    category: 'Wedding' as EventCategory,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    addEvent({
      id: newId,
      ...formData,
      coverImage: 'https://picsum.photos/seed/' + newId + '/800/600',
      items: [],
      isLocked: true,
      viewCount: 0,
    });
    router.push(`/events/${newId}/upload`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Create Luxury Event</h1>
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-8 lg:p-12 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground font-bold">Event Title</Label>
            <div className="relative">
              <Camera className="absolute left-3 top-3 w-4 h-4 text-primary" />
              <Input 
                id="title" 
                placeholder="e.g., Ahmed & Fatima's Barat" 
                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client" className="text-muted-foreground font-bold">Client Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
              <Input 
                id="client" 
                placeholder="Full Name" 
                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-muted-foreground font-bold">Event Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="date" 
                  type="date"
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-muted-foreground font-bold">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({ ...formData, category: val as EventCategory })}
              >
                <SelectTrigger className="h-12 bg-background/50 border-border/50 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Mehndi">Mehndi</SelectItem>
                  <SelectItem value="Barat">Barat</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6">
            <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20">
              Continue to Upload
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Unique gallery link will be generated automatically.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
