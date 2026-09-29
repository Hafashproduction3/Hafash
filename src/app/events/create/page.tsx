"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, User, Camera, ArrowLeft, Loader2, 
  Mail, Phone, Sparkles, PartyPopper, Heart, Crown, Baby, 
  Briefcase, Star, Check
} from 'lucide-react';
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
import { HafashLoader } from '@/components/ui/hafash-loader';
import { getUserPlan } from '@/lib/plans';
import { cn } from '@/lib/utils';

export type EventCategory = 
  | 'Wedding' 
  | 'Mehndi' 
  | 'Barat' 
  | 'Walima' 
  | 'Nikkah' 
  | 'Engagement' 
  | 'Maternity' 
  | 'Birthday' 
  | 'Corporate' 
  | 'Portrait' 
  | 'Other';

const CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: 'Wedding', label: 'Wedding', emoji: '💒' },
  { value: 'Mehndi', label: 'Mehndi', emoji: '🌿' },
  { value: 'Barat', label: 'Barat', emoji: '🐎' },
  { value: 'Walima', label: 'Walima', emoji: '🎉' },
  { value: 'Nikkah', label: 'Nikkah', emoji: '💍' },
  { value: 'Engagement', label: 'Engagement', emoji: '💐' },
  { value: 'Maternity', label: 'Maternity', emoji: '🤰' },
  { value: 'Birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'Corporate', label: 'Corporate', emoji: '💼' },
  { value: 'Portrait', label: 'Portrait', emoji: '📸' },
  { value: 'Other', label: 'Other', emoji: '✨' },
];

export default function CreateEventPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: '',
    category: 'Wedding' as EventCategory,
  });

  // ✅ Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // ✅ Load profile for plan check
  useEffect(() => {
    async function loadProfile() {
      if (!firestore || !user) return;
      try {
        const profileRef = doc(firestore, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }
      } catch (e) {
        console.error('Profile load failed:', e);
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, [firestore, user]);

  const currentPlan = getUserPlan(profile?.planId, user?.email);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 7);
  };

  // ✅ Calendar open on click
  const handleDateClick = () => {
    if (dateInputRef.current) {
      // Modern browsers: showPicker() method
      if ('showPicker' in dateInputRef.current) {
        try {
          (dateInputRef.current as any).showPicker();
        } catch (e) {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
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
      
      const now = new Date();
      const plan = getUserPlan(profileData.planId, user.email);

      // ✅ Starter plan: 7 days auto-delete
      // ✅ Other plans: no auto-delete (permanent)
      const autoDeleteAt = plan.id === 'starter'
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const expiresAt = plan.id === 'starter'
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
        photoCount: 0,
        deliveryProvider: 'demo',
        isLocked: true,
        isPublic: true, 
        isPaid: false,
        viewCount: 0,
        userId: user.uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        albumStatus: "New Selection",
        albumLinkEnabled: false,
        albumLinkToken: "",
        albumLinkCreated: "",
        studioName: profileData.studioName || "",
        whatsappNumber: profileData.whatsappNumber || "",
        studioLogo: profileData.studioLogo || "",
        // ✅ Auto-delete tracking
        planId: plan.id,
        autoDeleteAt: autoDeleteAt,       // 7 days for starter, null for others
        expiresAt: expiresAt,             // same logic
        lastExpiryWarningSent: null,
      };

      await setDoc(newDocRef, newGallery);

      // ✅ Show different message based on plan
      if (plan.id === 'starter') {
        toast({
          title: "Gallery Created ⚠️",
          description: "Starter plan mein gallery 7 din baad expire hogi. Upgrade to Professional for permanent galleries.",
        });
      } else {
        toast({
          title: "✅ Gallery Created",
          description: "Proceeding to upload center...",
        });
      }

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

  if (authLoading || profileLoading) {
    return <HafashLoader text="Securing Studio Environment..." />;
  }

  if (!user) return null;

  const isStarterPlan = currentPlan.id === 'starter';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white/5 hover:bg-primary/10 hover:text-primary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/30 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/90">
              New Event
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight text-white">
            Create <span className="text-primary italic">Luxury Event</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Start your studio journey by creating a new event.
          </p>
        </div>
      </div>

      {/* ═══ STARTER PLAN WARNING ═══ */}
      {isStarterPlan && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-lg animate-pulse">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-headline font-bold text-base text-white">
                ⚠️ Starter Plan — Gallery Expires in 7 Days
              </h3>
              <p className="text-sm text-white/80 mt-1 leading-relaxed">
                Aapki gallery <strong>7 din baad</strong> automatically delete ho jayegi. 
                Saari photos delete hone se pehle <strong className="text-amber-400">Professional plan</strong> upgrade karein taake galleries permanent rahein.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM ═══ */}
      <div className="relative bg-gradient-to-br from-card/60 via-card/40 to-card/20 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.4)] overflow-hidden">
        
        {/* Decorative gradient */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="relative space-y-8">
          
          {/* ═══ EVENT TITLE ═══ */}
          <div className="space-y-3">
            <Label htmlFor="title" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="title" 
              placeholder="e.g., Ahmed & Fatima's Barat" 
              className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg focus:border-primary/50 transition-all"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* ═══ CLIENT NAME + CATEGORY ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="client" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="client" 
                placeholder="Full Name" 
                className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg focus:border-primary/50 transition-all"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <PartyPopper className="w-3.5 h-3.5" />
                Category <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({ ...formData, category: val as EventCategory })}
              >
                <SelectTrigger className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg focus:border-primary/50 transition-all">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-2xl border-white/10 rounded-2xl max-h-[300px]">
                  {CATEGORIES.map((cat) => (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                      className="rounded-xl text-base cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ═══ CLIENT EMAIL + PHONE ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="clientEmail" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Client Email
              </Label>
              <Input 
                id="clientEmail" 
                type="email"
                placeholder="client@example.com" 
                className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg focus:border-primary/50 transition-all"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="clientPhone" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Client Phone
              </Label>
              <Input 
                id="clientPhone" 
                placeholder="+92..." 
                className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg focus:border-primary/50 transition-all"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
              />
            </div>
          </div>

          {/* ═══ EVENT DATE (Calendar Click) ═══ */}
          <div className="space-y-3">
            <Label htmlFor="date" className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5" />
              Event Date <span className="text-destructive">*</span>
            </Label>
            <div 
              className="relative cursor-pointer group"
              onClick={handleDateClick}
            >
              <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none z-10" />
              <Input 
                ref={dateInputRef}
                id="date" 
                type="date"
                className="h-14 bg-background/50 border-white/10 rounded-2xl text-lg pl-14 pr-4 focus:border-primary/50 transition-all cursor-pointer"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                onFocus={(e) => {
                  // ✅ Open calendar on focus
                  if ('showPicker' in e.target) {
                    try {
                      (e.target as any).showPicker();
                    } catch {}
                  }
                }}
              />
              <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-hover:text-primary transition-colors pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted-foreground italic pl-1">
              Tap karke calendar se date select karein
            </p>
          </div>

          {/* ═══ SUBMIT BUTTON ═══ */}
          <div className="pt-6">
            <Button 
              type="submit" 
              className="w-full h-16 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 text-lg font-bold rounded-2xl shadow-[0_20px_60px_rgba(212,175,55,0.3)] transition-all hover:scale-[1.02] active:scale-95 group"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                  Creating...
                </>
              ) : (
                <>
                  Continue to Upload
                  <Sparkles className="w-5 h-5 ml-3 group-hover:rotate-90 transition-transform duration-500" />
                </>
              )}
            </Button>
          </div>

        </form>
      </div>

      {/* ═══ INFO FOOTER ═══ */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-xs text-muted-foreground italic">
          {isStarterPlan 
            ? "💡 Tip: Upgrade to Professional for permanent galleries" 
            : "✨ Your galleries will be stored permanently"}
        </p>
      </div>

    </div>
  );
}