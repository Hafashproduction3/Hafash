"use client";
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import {
  Lock, Mail, Briefcase, User as UserIcon, Phone, Loader2,
  CheckCircle2, Eye, EyeOff, MapPin, Instagram, Sparkles, Globe,
  Camera, Building2, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { generateSubdomain, validateSubdomain } from '@/lib/subdomain';
import { cn } from '@/lib/utils';

type UserRole = 'photographer' | 'location-owner';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('photographer');

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Photographer-specific
  const [studioName, setStudioName] = useState('');
  const [tagline, setTagline] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Auto-generate subdomain from studio name (photographer only)
  const suggestedSubdomain = useMemo(() => {
    if (role !== 'photographer') return '';
    return generateSubdomain(studioName);
  }, [studioName, role]);

  // Check subdomain availability (photographer only)
  useEffect(() => {
    if (role !== 'photographer') {
      setSubdomainAvailable(null);
      return;
    }
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
  }, [suggestedSubdomain, firestore, role]);

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

    // Common validations
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

    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Apna poora naam likhein.",
      });
      return;
    }

    // Photographer-specific validations
    if (role === 'photographer') {
      if (!studioName.trim()) {
        toast({
          variant: "destructive",
          title: "Studio Name Required",
          description: "Studio ka naam likhein.",
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
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      if (newUser) {
        await updateProfile(newUser, {
          displayName: role === 'photographer' ? studioName : fullName,
        });

        if (role === 'photographer') {
          // ═══ PHOTOGRAPHER FLOW ═══
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
            role: 'photographer',
            studioName: studioName.trim(),
            photographerName: fullName.trim(),
            whatsappNumber: whatsappNumber.replace(/\s+/g, ''),
            email: email,
            city: city.trim(),
            tagline: tagline.trim(),
            instagramLink: instagramLink.trim(),
            subdomain: finalSubdomain,
            subdomainReservedAt: new Date().toISOString(),
            planId: 'starter',
            subscriptionStatus: 'inactive',
            theme: 'mixed',
            updatedAt: new Date().toISOString(),
          };

          await setDoc(doc(firestore, 'users', newUser.uid), userProfile);

          await setDoc(doc(firestore, 'publicProfiles', newUser.uid), {
            userId: newUser.uid,
            studioName: studioName.trim(),
            photographerName: fullName.trim(),
            tagline: tagline.trim(),
            city: city.trim(),
            whatsappNumber: whatsappNumber.replace(/\s+/g, ''),
            instagramLink: instagramLink.trim(),
            facebookLink: '',
            youtubeLink: '',
            tiktokLink: '',
            studioLogo: '',
            studioBanner: '',
            photographerPhoto: '',
            aboutBio: '',
            services: [],
            packages: [],
            videoUrl: '',
            stats: { years: 5, clients: 100, appreciations: 0 },
            theme: 'mixed',
            subdomain: finalSubdomain,
            planId: 'starter',
            updatedAt: new Date().toISOString(),
          });

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
              description: "Account created, but verification email nahi gayi.",
            });
          }

        } else {
          // ═══ LOCATION OWNER FLOW ═══
          const ownerProfile = {
            userId: newUser.uid,
            role: 'location-owner',
            fullName: fullName.trim(),
            whatsappNumber: whatsappNumber.replace(/\s+/g, ''),
            email: email,
            city: city.trim(),
            verification: {
              status: 'unverified',
              verifiedAt: null,
              verifiedBy: null,
            },
            subscriptionStatus: 'inactive',
            updatedAt: new Date().toISOString(),
          };

          await setDoc(doc(firestore, 'users', newUser.uid), ownerProfile);

          try {
            await sendEmailVerification(newUser);
            toast({
              title: "✅ Account Created!",
              description: "Verification email sent. Location dashboard mein welcome!",
            });
          } catch (verifyError: any) {
            toast({
              variant: "destructive",
              title: "Verification Delayed",
              description: "Account created, but verification email nahi gayi.",
            });
          }
        }

        router.push('/verify-email');
      }
    } catch (error: any) {
      const { title, description } = getFirebaseErrorMessage(error);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <HafashLoader text="Initializing Your Environment..." />
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
            <h1 className="text-3xl font-headline font-bold">Create Your Account</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Pehle apna role select karein
            </p>
          </div>
        </div>

        {/* ═══ ROLE SELECTION ═══ */}
        <div className="bg-card border border-border/50 rounded-[2rem] p-6 lg:p-8 shadow-2xl mb-6">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-primary mb-4 block">
            Main Hu: *
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('photographer')}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all text-left",
                role === 'photographer'
                  ? "border-primary bg-primary/5 scale-105 shadow-xl"
                  : "border-border/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  role === 'photographer' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Camera className="w-5 h-5" />
                </div>
                <p className="font-headline font-bold text-base">Photographer</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Photos upload karein, clients ko galleries bhejein, bookings manage karein
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('location-owner')}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all text-left",
                role === 'location-owner'
                  ? "border-primary bg-primary/5 scale-105 shadow-xl"
                  : "border-border/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  role === 'location-owner' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Home className="w-5 h-5" />
                </div>
                <p className="font-headline font-bold text-base">Location Owner</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Apni villa, studio, garden ya venue list karein photographers ke liye
              </p>
            </button>
          </div>
        </div>

        {/* ═══ SIGNUP FORM ═══ */}
        <div className="bg-card border border-border/50 rounded-[2rem] p-8 lg:p-10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Photographer: Studio Name + Subdomain Preview */}
            {role === 'photographer' && (
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
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {role === 'photographer' ? 'Photographer Name *' : 'Full Name *'}
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  placeholder="Your Full Name"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* City + WhatsApp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  WhatsApp *
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
            </div>

            {/* Photographer: Tagline */}
            {role === 'photographer' && (
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
            )}

            {/* Photographer: Instagram */}
            {role === 'photographer' && (
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
            )}

            {/* Email */}
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

            {/* Password */}
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 mt-6"
              disabled={loading || (role === 'photographer' && subdomainAvailable === false)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {role === 'photographer' ? 'Create My Studio' : 'Create My Account'}
                </>
              )}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground italic">
              {role === 'photographer'
                ? 'Subdomain reserve ho jayega. Live karne ke liye Enterprise plan activate karein.'
                : 'Location dashboard milega jahan apni locations manage kar sakte hain.'
              }
            </p>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary font-bold hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}