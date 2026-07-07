"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * RESET PASSWORD ARCHITECTURE (DRAFT)
 * 
 * TODO: Activate this page as the primary reset handler after:
 * 1. Custom domain recovery is complete.
 * 2. Vercel deployment is verified.
 * 3. Firebase Authentication 'Action URL' is updated to: https://hafash.pk/reset-password
 */

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const oobCode = searchParams.get('oobCode');

  // Verify the reset code on mount
  useEffect(() => {
    async function verify() {
      if (!oobCode || !auth) {
        setVerifying(false);
        return;
      }
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setCodeValid(true);
      } catch (error) {
        setCodeValid(false);
      } finally {
        setVerifying(false);
      }
    }
    verify();
  }, [oobCode, auth]);

  // Password strength calculation
  const strength = useMemo(() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s += 25;
    if (/[A-Z]/.test(newPassword)) s += 25;
    if (/[0-9]/.test(newPassword)) s += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) s += 25;
    return s;
  }, [newPassword]);

  const strengthColor = strength <= 25 ? 'bg-destructive' : strength <= 75 ? 'bg-amber-500' : 'bg-green-500';
  const strengthLabel = strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Excellent';

  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !oobCode) return;
    
    if (strength < 50) {
      toast({ variant: "destructive", title: "Security Alert", description: "Please choose a stronger password." });
      return;
    }

    if (!passwordsMatch) {
      toast({ variant: "destructive", title: "Validation Error", description: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsSuccess(true);
      toast({ title: "Success", description: "Password has been updated securely." });
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to reset password. The link may have expired."
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground animate-pulse uppercase tracking-widest text-[10px] font-bold">Verifying Security Token...</p>
      </div>
    );
  }

  if (!oobCode || !codeValid) {
    return (
      <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
        <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground">The password reset link is invalid or has already been used. Please request a new one.</p>
        </div>
        <Link href="/login" className="block pt-4">
          <Button variant="outline" className="w-full rounded-xl font-bold">Return to Login</Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-10 h-10 text-green-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold">Security Updated</h1>
          <p className="text-sm text-muted-foreground">Your password has been changed successfully. Redirecting you to the studio login...</p>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-[progress_3s_linear]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-headline font-bold">Secure Reset</h1>
        <p className="text-muted-foreground mt-1 text-sm">Create a new password for your studio</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
            <Input 
              id="newPassword" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" 
              required 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Strength Indicator */}
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest px-1">
              <span className="text-muted-foreground">Strength</span>
              <span className={strengthColor.replace('bg-', 'text-')}>{strengthLabel}</span>
            </div>
            <Progress value={strength} className="h-1" indicatorClassName={strengthColor} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
            <Input 
              id="confirmPassword" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className={cn(
                "pl-10 h-12 rounded-xl bg-background/50 border-border/50",
                confirmPassword && !passwordsMatch && "border-destructive/50 ring-destructive/20"
              )} 
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" 
          disabled={loading || !passwordsMatch || strength < 50}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
          {loading ? "Updating Vault..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/security/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-6">
            <img src="/hafash-logo.png" alt="Hafash Logo" className="h-[57px] lg:h-[70px] w-auto" />
            <Link href="/" className="inline-block">
              <span className="text-4xl font-headline font-bold text-primary italic">Hafash.pk</span>
            </Link>
          </div>
        </div>

        <Suspense fallback={<div className="text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
