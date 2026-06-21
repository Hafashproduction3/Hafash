
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Camera, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://picsum.photos/seed/login/1920/1080" className="w-full h-full object-cover grayscale" alt="Background" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="text-4xl font-headline font-bold text-primary italic">Hafash.pk</span>
          </Link>
          <h1 className="text-2xl font-headline font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Access your studio dashboard</p>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-8 lg:p-10 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input id="email" type="email" placeholder="name@studio.com" className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-12 rounded-xl bg-background/50 border-border/50" required />
              </div>
            </div>

            <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? "Authenticating..." : "Login to Studio"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">New to Hafash? </span>
            <Link href="/signup" className="text-primary font-bold hover:underline">Create an account</Link>
          </div>
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-8">
          By logging in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
