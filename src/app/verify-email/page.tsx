"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
        description: "A new verification email has been sent to your inbox.",
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
          title: "Verified",
          description: "Your email has been successfully verified.",
        });
        router.push('/dashboard');
      } else {
        toast({
          description: "Email not yet verified. Please check your inbox.",
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
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
