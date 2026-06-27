"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Lock, Mail, Briefcase, User as UserIcon, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [photographerName, setPhotographerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

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
    const regex = /^\+?[1-9]\d{1,14}$/;
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
        description: "Please enter a valid international number (e.g., +923001234567).",
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      if (userCredential.user) {
        // 1. Update Auth Profile
        await updateProfile(userCredential.user, {
          displayName: studioName
        });

        // 2. Create Firestore Profile
        const userProfile = {
          userId: uid,
          studioName,
          photographerName,
          whatsappNumber: whatsappNumber.replace(/\s+/g, ''),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(firestore, 'users', uid), userProfile);
        
        // 3. Send Email Verification
        await sendEmailVerification(userCredential.user);
        
        toast({
          title: "Account Created",
          description: "Verification email sent. Please verify your account.",
        });
        
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/signup/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10 my-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <Link href="/" className="inline-block">
              <span className="text-4xl font-headline font-bold text-primary italic">Hafash.pk</span>
            </Link>
          </div>
          <div className="mt-2">
            <h1 className="text-2xl font-headline font-bold">Start Your Studio</h1>
            <p className="text-muted-foreground mt-1 text-sm">Join the luxury platform for photographers</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-[2rem] p-8 lg:p-10 shadow-2xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="studio">Studio Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="studio" 
                  placeholder="E.g., Cinematic Memories" 
                  className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Photographer Name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="name" 
                  placeholder="Your Full Name" 
                  className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={photographerName}
                  onChange={(e) => setPhotographerName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@studio.com" 
                  className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="whatsapp" 
                  placeholder="+923001234567" 
                  className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic px-1">Used for gallery delivery and client contact.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                    required 
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-11 rounded-xl bg-background/50 border-border/50" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              {loading ? "Creating Studio..." : "Join Now"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Already have a studio? </span>
            <Link href="/login" className="text-primary font-bold hover:underline">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}