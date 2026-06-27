"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail, Loader2, RefreshCw, LogOut, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!user || cooldown > 0) return;
    
    setResending(true);
    try {
      await sendEmailVerification(user);
      
      toast({
        title: "Verification Sent",
        description: "Verification email sent successfully. Please check your Inbox, Spam or Promotions folder.",
      });
      
      setCooldown(60); 
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast({
          variant: "destructive",
          title: "Rate Limit Exceeded",
          description: "We recently sent a verification email. Please wait a moment before trying again.",
        });
        setCooldown(120); 
      } else {
        toast({
          variant: "destructive",
          title: "Delivery Error",
          description: error.message || "We couldn't deliver the verification email. Please try again later.",
        });
      }
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
          title: "Verification Confirmed",
          description: "Welcome to your luxury studio dashboard!",
        });
        router.push('/dashboard');
      } else {
        toast({
          description: "Account still unverified. Please check your inbox (including spam).",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: "Failed to synchronize status with server. Please try again.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      console.error("[VERIFY_DEBUG] Logout error:", error);
    }
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
        <img src="https://picsum.photos/seed/verify/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" data-ai-hint="luxury studio" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-headline font-bold">Verify Your Identity</h1>
            <p className="text-muted-foreground">
              A verification email has been sent to your email address.
            </p>
            
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-start gap-3 text-left">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you don't see the email within 2 minutes, please check your <span className="text-primary font-bold">Spam</span> or <span className="text-primary font-bold">Promotions</span> folder.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-lg gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Check Verification Status
            </Button>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-12 rounded-xl border-border/50 font-bold"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
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
