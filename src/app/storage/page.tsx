
"use client";

import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { 
  HardDrive, 
  Check, 
  Zap, 
  Loader2, 
  ShieldCheck, 
  Download, 
  Activity, 
  ArrowLeft, 
  ImageIcon, 
  FolderOpen,
  ArrowUpCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN, calculateUsageGb } from '@/lib/plans';
import { doc, collection, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function StoragePage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(profileRef);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: galleriesLoading } = useCollection(galleriesQuery);

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const usageGb = useMemo(() => {
    return calculateUsageGb(galleries);
  }, [galleries]);

  const usagePercent = useMemo(() => {
    return Math.min((usageGb / currentPlan.storageGb) * 100, 100);
  }, [usageGb, currentPlan.storageGb]);

  const totalGalleries = useMemo(() => {
    return Array.isArray(galleries) ? galleries.length : 0;
  }, [galleries]);

  const totalPhotos = useMemo(() => {
    if (!galleries || !Array.isArray(galleries)) return 0;
    return galleries.reduce((acc, g) => acc + (Array.isArray(g.items) ? g.items.length : 0), 0);
  }, [galleries]);

  // Determine logical next plan for the quick upgrade button
  const nextPlanId = useMemo(() => {
    if (currentPlan.id === 'starter') return 'pro';
    if (currentPlan.id === 'pro') return 'business';
    return null;
  }, [currentPlan.id]);

  if (authLoading || profileLoading || (galleriesLoading && !galleries)) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 p-6 lg:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-5xl font-headline font-bold">Studio Storage & Quotas</h1>
            <p className="text-muted-foreground mt-2 italic text-lg">Premium infrastructure for the world's finest photography studios.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Enterprise Class R2 Storage Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Card */}
        <Card className="lg:col-span-2 bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-xl">
          <CardHeader className="bg-background/30 border-b border-border/30 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <CardTitle className="flex items-center gap-4 text-2xl font-headline font-bold">
                <HardDrive className="w-8 h-8 text-primary" />
                Current Utilization
              </CardTitle>
              {nextPlanId && (
                <Link href={`/checkout/${nextPlanId}`}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl gap-2 h-12 px-6 shadow-lg shadow-primary/20">
                    <ArrowUpCircle className="w-4 h-4" /> Upgrade Workspace
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Active Subscription</p>
                <h3 className="text-4xl font-headline font-bold text-primary">{currentPlan.name} Plan</h3>
              </div>
              <div className="text-right space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Total Storage</p>
                <h3 className="text-4xl font-headline font-bold">{currentPlan.storageGb} GB</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="bg-background/40 p-4 rounded-2xl border border-border/20 flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Photos</p>
                  <p className="text-xl font-bold">{totalPhotos}</p>
                </div>
              </div>
              <div className="bg-background/40 p-4 rounded-2xl border border-border/20 flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Galleries</p>
                  <p className="text-xl font-bold">{totalGalleries}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
                <span>{usageGb.toFixed(2)} GB Used</span>
                <span className="text-primary">{Math.max(currentPlan.storageGb - usageGb, 0).toFixed(2)} GB Remaining</span>
              </div>
              <div className="h-4 w-full bg-background rounded-full overflow-hidden border border-border/50 p-1">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${usagePercent}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-background/50 rounded-3xl p-6 border border-border/30 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Download className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">ZIP Size Limit</p>
                  <p className="text-xl font-headline font-bold">{currentPlan.zipLimitGb}GB</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-3xl p-6 border border-border/30 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">ZIP Priority</p>
                  <p className="text-xl font-headline font-bold">{currentPlan.priorityLabel}</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-3xl p-6 border border-border/30 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">CDN Speed</p>
                  <p className="text-xl font-headline font-bold">Max Speed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-8 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h4 className="text-xl font-headline font-bold">Priority Processing</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Higher plans move to the front of the ZIP generation queue. Once generated, all files are delivered at maximum Cloudflare CDN speeds.
            </p>
          </div>
          <Button variant="outline" className="rounded-2xl h-12 border-primary/30 text-primary font-bold hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>

      {/* Subscription Plans Section */}
      <div className="text-center space-y-4 pt-10">
        <h2 className="text-4xl font-headline font-bold">Premium Expansion Plans</h2>
        <p className="text-muted-foreground">Unlock higher delivery thresholds and faster ZIP preparation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(HAFASH_PLANS).map(plan => {
          const isCurrent = currentPlan.id === plan.id;
          const isUpgrade = plan.priorityLevel > currentPlan.priorityLevel;
          
          return (
            <Card key={plan.id} className={`relative overflow-hidden border-border/50 bg-card transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 rounded-[2.5rem] ${plan.id === 'pro' ? 'ring-2 ring-primary scale-105 z-10' : ''}`}>
              {plan.id === 'pro' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-6 py-2 rounded-bl-3xl tracking-[0.2em]">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center pt-12 pb-8">
                <CardTitle className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-4 font-bold">{plan.name} Tier</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-headline font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground font-bold">/mo</span>
                </div>
                <p className="text-xl font-bold mt-6">{plan.storageGb}GB Cloud Capacity</p>
              </CardHeader>
              <CardContent className="space-y-5 py-8 px-10 border-t border-border/20">
                <div className="flex items-center gap-4 text-sm font-bold text-primary">
                   <Activity className="w-5 h-5 shrink-0" />
                   <span>{plan.priorityLabel} Processing</span>
                </div>
                {plan.features.map(feat => (
                  <div key={feat} className="flex items-center gap-4 text-sm font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pb-12 pt-6 px-10">
                {isCurrent ? (
                  <Button disabled className="w-full h-14 rounded-2xl border-primary/30 text-primary bg-primary/10 font-bold uppercase tracking-widest text-xs">Current Plan</Button>
                ) : (
                  <Link href={`/checkout/${plan.id}`} className="w-full">
                    <Button className={`w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02] ${plan.id === 'pro' ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20' : 'bg-white text-black hover:bg-gray-100'}`}>
                      {isUpgrade ? 'Upgrade Workspace' : 'Select Plan'}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
