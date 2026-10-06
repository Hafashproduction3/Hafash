"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Mail, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';

export default function VerifyEmailPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Profile fetch (role check ke liye) ───
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  // ─── Redirect role ke hisaab se ───
  const redirectByRole = () => {
    if (profile?.role === 'location-owner') {
      router.push('/location-dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    if (!loading && !profileLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified && profile) {
        redirectByRole();
      }
    }
  }, [user, loading, profile, profileLoading, router]);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "✅ Verification Email Bhej Di",
        description: "Apna inbox check karein — verification link bhej diya gaya hai.",
      });
    } catch (error: any) {
      const { title, description } = getFirebaseErrorMessage(error);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        toast({
          title: "✅ Email Verified",
          description: "Aapka email successfully verify ho gaya.",
        });
        // Profile load hone ka intezar karein, phir redirect
        setTimeout(() => {
          redirectByRole();
        }, 500);
      } else {
        toast({
          description: "Email abhi verify nahi hua. Apna inbox check karein.",
        });
      }
    } catch (error: any) {
      const { title, description } = getFirebaseErrorMessage(error);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading || profileLoading) return (
    <HafashLoader text="Securing Studio Access..." />
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/verify/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold">Verify your email</h1>
            <p className="text-muted-foreground">
              You must verify your email address before using Hafash Studio. Please check your inbox for a verification link.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Refresh Status
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl border-border/50 font-bold"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Resend Verification Email
            </Button>

            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 font-bold"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}