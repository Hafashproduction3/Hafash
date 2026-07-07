"use client";

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { HAFASH_PLANS, type PlanId } from '@/lib/plans';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Loader2,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';

export default function PaymentGatewayPage() {
  const params = useParams();
  const planId = (params?.planId as PlanId) || 'pro';
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const targetPlan = HAFASH_PLANS[planId] || HAFASH_PLANS.pro;

  const handleSimulatePayment = async () => {
    if (!firestore || !user) return;
    
    setIsProcessing(true);
    
    try {
      // Simulate network delay for payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update the user's subscription in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      
      // Calculate a placeholder renewal date (30 days from now)
      const nextRenewal = new Date();
      nextRenewal.setDate(nextRenewal.getDate() + 30);

      await updateDoc(userRef, {
        planId: planId,
        subscriptionStatus: 'active',
        subscriptionActivatedAt: new Date().toISOString(),
        subscriptionNextRenewal: nextRenewal.toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Subscription Activated",
        description: `Your studio is now upgraded to ${targetPlan.name}.`,
      });
      
      // Navigate to storage to see the new limits
      router.push('/storage');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: error.message || "An error occurred during subscription sync.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/5">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-headline font-bold">Secure Checkout</h1>
          <p className="text-muted-foreground italic">Powered by Hafash Global Payments</p>
        </div>

        <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardContent className="p-10 space-y-8">
            <div className="bg-background/50 p-6 rounded-2xl border border-border/30 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold">{targetPlan.name} Subscription Upgrade</span>
                <span className="text-2xl font-headline font-bold text-primary">{targetPlan.price}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Payment Method</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 border-2 border-primary bg-primary/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm">Debit / Credit Card</span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div className="p-4 border border-border/30 bg-background/30 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-lg">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="font-bold text-sm text-muted-foreground">Easypaisa / JazzCash</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Regional Method (In Setup)</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold gap-3 shadow-2xl shadow-primary/20 transition-all"
              onClick={handleSimulatePayment}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Lock className="w-6 h-6" />}
              {isProcessing ? "Finalizing Subscription..." : `Pay ${targetPlan.price} Now`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3 text-green-500" /> Secure 256-bit Encrypted Transaction
            </div>
          </CardContent>
        </Card>

        <Button 
          variant="ghost" 
          className="w-full rounded-2xl gap-2 font-bold text-muted-foreground hover:text-primary"
          onClick={() => router.back()}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4" /> Return to Summary
        </Button>
      </div>
    </div>
  );
}
