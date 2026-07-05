
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { Calendar as CalendarIcon, User, Camera, ArrowLeft, Loader2, Mail, Phone } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type EventCategory = 'Wedding' | 'Mehndi' | 'Barat' | 'Engagement' | 'Other';

export default function CreateEventPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: '',
    category: 'Wedding' as EventCategory,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please login to create an event."
      });
      return;
    }

    setLoading(true);

    try {
      const profileRef = doc(firestore, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.exists() ? profileSnap.data() : {};

      const galleriesRef = collection(firestore, 'galleries');
      const newDocRef = doc(galleriesRef);
      const newId = newDocRef.id;
      const slug = generateSlug(formData.title);
      
      const newGallery = {
        id: newId,
        slug: slug,
        title: formData.title,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        date: formData.date,
        category: formData.category,
        coverImage: `https://picsum.photos/seed/${newId}/800/600`,
        items: [],
        mediaCount: 0,
        deliveryProvider: 'demo',
        isLocked: true,
        isPublic: true, 
        isPaid: false,
        viewCount: 0,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        albumStatus: "New Selection",
        albumLinkEnabled: false,
        albumLinkToken: "",
        albumLinkCreated: "",
        studioName: profileData.studioName || "",
        whatsappNumber: profileData.whatsappNumber || "",
        studioLogo: profileData.studioLogo || ""
      };

      await setDoc(newDocRef, newGallery);
      toast({
        title: "Gallery Created",
        description: "Proceeding to upload center...",
      });
      router.push(`/events/${newId}/upload`);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'galleries',
          operation: 'create',
        }));
      } else {
        toast({
          variant: "destructive",
          title: "Create Failed",
          description: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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
                className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-muted-foreground font-bold">Client Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="client" 
                  placeholder="Full Name" 
                  className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="clientEmail" className="text-muted-foreground font-bold">Client Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="clientEmail" 
                  type="email"
                  placeholder="client@example.com" 
                  className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="text-muted-foreground font-bold">Client Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="clientPhone" 
                  placeholder="+92..." 
                  className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-muted-foreground font-bold">Event Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
              <Input 
                id="date" 
                type="date"
                className="pl-10 h-12 bg-background/50 border-border/50 rounded-xl"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-6">
            <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {loading ? "Creating..." : "Continue to Upload"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
