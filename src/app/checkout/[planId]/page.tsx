
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';
import { useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  HardDrive,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const planId = (params?.planId as PlanId) || 'pro';
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();

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

  const currentPlan = useMemo(() => {
    const id = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[id] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const targetPlan = useMemo(() => {
    return HAFASH_PLANS[planId] || HAFASH_PLANS.pro;
  }, [planId]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">Review Your Upgrade</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-primary/10 border-b border-primary/20 p-6">
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Subscription Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Current Plan</span>
                  <span className="font-bold text-sm uppercase tracking-widest">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">New Plan</span>
                  <span className="font-bold text-primary text-sm uppercase tracking-widest">{targetPlan.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Storage Upgrade</span>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-muted-foreground">{currentPlan.storageGb}GB</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-green-500">{targetPlan.storageGb}GB</span>
                  </div>
                </div>
                <div className="pt-4 flex justify-between items-center">
                  <span className="text-xl font-headline font-bold">Total Monthly</span>
                  <span className="text-3xl font-headline font-bold text-primary">{targetPlan.price}</span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm uppercase tracking-widest">Studio Security Sync</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your upgraded storage and processing priority will be activated immediately across all your galleries once payment is confirmed.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-background/30 border-b border-border/30 p-6">
                <CardTitle className="text-lg font-headline font-bold">Included in {targetPlan.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {targetPlan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
                
                <div className="mt-8 p-4 bg-background/50 rounded-2xl border border-border/30 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expansion Capacity</p>
                    <p className="text-lg font-headline font-bold">+{targetPlan.storageGb - currentPlan.storageGb} GB New Storage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link href={`/checkout/${planId}/payment`}>
              <Button className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold gap-3 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]">
                <CreditCard className="w-6 h-6" /> Proceed to Payment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
