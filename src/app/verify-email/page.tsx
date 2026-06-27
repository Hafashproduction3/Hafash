"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail, Loader2, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Sent",
        description: "A new verification link has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to resend verification email.",
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
          title: "Email Verified",
          description: "Welcome to your studio dashboard!",
        });
        router.push('/dashboard');
      } else {
        toast({
          description: "Email is still not verified. Please check your inbox.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh status.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/verify/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold">Verify Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <span className="text-primary font-bold">{user?.email}</span>. Please verify your email to unlock your studio.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-lg gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Refresh Status
            </Button>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-12 rounded-xl border-border/50 font-bold"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Resend Email
              </Button>
              <Button 
                variant="ghost" 
                className="h-12 rounded-xl text-destructive hover:bg-destructive/10 font-bold"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
              Secure Studio Authentication Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}