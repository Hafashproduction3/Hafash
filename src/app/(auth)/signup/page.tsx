
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Camera, Lock, User, Mail, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Store studio name in user profile as a simple solution
      await updateProfile(userCredential.user, {
        displayName: studioName
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Account Creation Failed",
        description: error.message || "Please try again with different details.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/signup/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="text-4xl font-headline font-bold text-primary italic">Hafash.pk</span>
          </Link>
          <h1 className="text-2xl font-headline font-bold">Start Your Studio</h1>
          <p className="text-muted-foreground mt-2">Join the luxury platform for photographers</p>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-8 lg:p-10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="studio">Studio Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="studio" 
                  placeholder="E.g., Cinematic Memories" 
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
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
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
