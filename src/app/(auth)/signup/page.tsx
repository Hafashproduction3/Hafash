"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import {
  Lock, Mail, Briefcase, User as UserIcon, Phone, Loader2,
  CheckCircle2, Eye, EyeOff, MapPin, Instagram, Sparkles, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { generateSubdomain, validateSubdomain } from '@/lib/subdomain';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [photographerName, setPhotographerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [city, setCity] = useState('');
  const [tagline, setTagline] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const suggestedSubdomain = useMemo(() => {
    return generateSubdomain(studioName);
  }, [studioName]);

  useEffect(() => {
    if (!suggestedSubdomain || suggestedSubdomain.length < 3 || !firestore) {
      setSubdomainAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const validation = validateSubdomain(suggestedSubdomain);
        if (!validation.valid) {
          setSubdomainAvailable(false);
          setCheckingSubdomain(false);
          return;
        }

        const q = query(
          collection(firestore, 'users'),
          where('subdomain', '==', suggestedSubdomain),
          limit(1)
        );
        const snap = await getDocs(q);
        setSubdomainAvailable(snap.empty);
      } catch (err) {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [suggestedSubdomain, firestore]);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.emailVerified) {
        router.push('/dashboard');
      } else {
        router.push('/verify-email');
      }
    }
  }, [user, authLoading, router]);

  const validateWhatsApp = (number: string) => {
    const regex = /^03\d{9}$/;
    return regex.test(number.replace(/\s+/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase services are not initialized.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Passwords do not match.",
      });
      return;
    }

    if (!validateWhatsApp(whatsappNumber)) {
      toast({
        variant: "destructive",
        title: "Invalid WhatsApp",
        description: "Please enter a valid Pakistani WhatsApp number (e.g., 03001234567).",
      });
      return;
    }

    if (!suggestedSubdomain || suggestedSubdomain.length < 3) {
      toast({
        variant: "destructive",
        title: "Invalid Studio Name",
        description: "Studio name se valid subdomain nahi ban sakta. Kam az kam 3 characters.",
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      if (newUser) {
        await updateProfile(newUser, {
          displayName: studioName,
        });

        let finalSubdomain = suggestedSubdomain;
        let counter = 1;

        while (counter < 100) {
          const q = query(
            collection(firestore, 'users'),
            where('subdomain', '==', finalSubdomain),
            limit(1)
          );
          const snap = await getDocs(q);
          if (snap.empty) break;
          counter++;
          finalSubdomain = `${suggestedSubdomain}${counter}`;
        }

        const userProfile = {
          userId: newUser.uid,
          studioName,
          photographerName,
          whatsappNumber: whatsappNumber.replace(/\s+/g, ''),
          email: email,
          city: city.trim(),
          tagline: tagline.trim(),
          instagramLink: instagramLink.trim(),
          subdomain: finalSubdomain,
          subdomainReservedAt: new Date().toISOString(),
          planId: 'starter',
          subscriptionStatus: 'inactive',
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(firestore, 'users', newUser.uid), userProfile);

        try {
          await sendEmailVerification(newUser);
          toast({
            title: "✅ Studio Created!",
            description: `Verification email sent. Aapka URL: ${finalSubdomain}.hafash.pk`,
          });
        } catch (verifyError: any) {
          toast({
            variant: "destructive",
            title: "Verification Delayed",
            description: "Account created, but verification email nahi gayi. Next screen se resend karein.",
          });
        }

        router.push('/verify-email');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "Please check your details and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <HafashLoader text="Initializing Your Studio Environment..." />
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/signup/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-2xl relative z-10 my-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <Link href="/" className="inline-block">
              <span className="text-4xl font-headline font-bold text-primary italic">Hafash.pk</span>
            </Link>
          </div>
          <div className="mt-2">
            <h1 className="text-3xl font-headline font-bold">Start Your Studio</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Apna studio register karein — portfolio 2 minute mein ready
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-[2rem] p-8 lg:p-10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* STUDIO NAME */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Studio Name *
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  placeholder="E.g., Ahmed Wedding Photography"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                  required
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                />
              </div>

              {studioName.length >= 3 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 mt-2">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                      Aapka Reserved URL (Enterprise Plan)
                    </p>
                    <p className="text-sm font-mono font-bold text-white truncate">
                      {suggestedSubdomain || 'yourstudio'}.hafash.pk
                    </p>
                  </div>
                  {checkingSubdomain ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : subdomainAvailable === true ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-bold uppercase tracking-widest shrink-0">
                      ✓ Available
                    </Badge>
                  ) : subdomainAvailable === false ? (
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[9px] font-bold uppercase tracking-widest shrink-0">
                      Taken
                    </Badge>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Photographer Name *
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="Your Full Name"
                    className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                    required
                    value={photographerName}
                    onChange={(e) => setPhotographerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  City
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="Karachi"
                    className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Tagline (Optional)
              </Label>
              <div className="relative">
                <Sparkles className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  placeholder="Karachi's Premium Wedding Photographer"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  WhatsApp Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="03001234567"
                    className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Instagram (Optional)
                </Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="@ahmedwedding"
                    className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  type="email"
                  placeholder="name@studio.com"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 rounded-xl bg-background/50 border-border/50"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 rounded-xl bg-background/50 border-border/50"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 mt-6"
              disabled={loading || subdomainAvailable === false}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Studio...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create My Studio
                </>
              )}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground italic">
              Subdomain reserve ho jayega. Live karne ke liye Enterprise plan (200GB) activate karein.
            </p>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Already have a studio? </span>
            <Link href="/login" className="text-primary font-bold hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}