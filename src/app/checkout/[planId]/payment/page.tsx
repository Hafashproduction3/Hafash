"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { HAFASH_PLANS, type PlanId } from '@/lib/plans';
import { isOwnerAccount } from '@/lib/owner';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Lock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  XCircle,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PaymentGatewayPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const planId = (params?.planId as PlanId) || 'pro';
  const targetPlan = HAFASH_PLANS[planId] || HAFASH_PLANS.pro;
  const isOwner = isOwnerAccount(user?.email);

  // These come from the redirectUrl / cancelUrl we pass to Safepay when
  // creating the checkout session (see /api/safepay/checkout/route.ts).
  const paymentSucceeded = searchParams?.get('success') === 'true';
  const paymentCancelled = searchParams?.get('cancelled') === 'true';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handlePayment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsProcessing(true);

    try {
      const idToken = await user.getIdToken();

      // Owner account: skip Safepay entirely, activate instantly via a
      // server route that re-verifies the owner email server-side.
      const endpoint = isOwner
        ? '/api/owner/activate-plan'
        : '/api/safepay/checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          planId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to process your request.'
        );
      }

      if (isOwner) {
        // Owner activation happened directly, no external checkout needed.
        router.push(`/checkout/${planId}/payment?success=true`);
        return;
      }

      if (!data?.checkoutUrl) {
        throw new Error('Safepay checkout URL was not returned.');
      }

      window.location.href = data.checkoutUrl;
    } catch (error: any) {
      console.error('[PAYMENT] Error:', error);

      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description:
          error?.message ||
          'Unable to process this right now. Please try again.',
      });

      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return null;
  }

  // --- SUCCESS STATE ---
  if (paymentSucceeded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-green-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/5">
            <PartyPopper className="w-12 h-12 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold">
              {isOwner ? 'Plan Activated!' : 'Payment Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {isOwner
                ? `Your ${targetPlan.name} plan is now active.`
                : `Your ${targetPlan.name} plan is being activated. This usually takes just a few seconds.`}
            </p>
          </div>

          <Link href="/dashboard">
            <Button className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold">
              Go to Dashboard
            </Button>
          </Link>

          {!isOwner && (
            <p className="text-xs text-muted-foreground">
              If your plan doesn&apos;t reflect the upgrade after a minute,
              refresh the dashboard or contact support.
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- CANCELLED STATE ---
  if (paymentCancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-destructive/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-8 ring-destructive/5">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold">
              Payment Cancelled
            </h1>
            <p className="text-muted-foreground">
              No amount was charged. You can try again whenever you&apos;re
              ready.
            </p>
          </div>

          <Button
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold"
            onClick={() => router.push(`/checkout/${planId}/payment`)}
          >
            Try Again
          </Button>

          <Button
            variant="ghost"
            className="w-full rounded-2xl gap-2 font-bold text-muted-foreground hover:text-primary"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // --- DEFAULT: PAYMENT FORM (initial state) ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/5">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-3xl font-headline font-bold">
            {isOwner ? 'Activate Plan' : 'Secure Checkout'}
          </h1>

          <p className="text-muted-foreground italic">
            {isOwner ? 'Owner account — no payment required' : 'Powered by Safepay'}
          </p>
        </div>

        <Card className="bg-card border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardContent className="p-10 space-y-8">

            <div className="bg-background/50 p-6 rounded-2xl border border-border/30 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                <span>Description</span>
                <span>Amount</span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="font-bold">
                  {targetPlan.name} Subscription
                </span>

                <span className="text-2xl font-headline font-bold text-primary whitespace-nowrap">
                  {isOwner ? 'Free' : targetPlan.price}
                </span>
              </div>
            </div>

            {!isOwner && (
              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Payment Method
                </div>

                <div className="p-4 border-2 border-primary bg-primary/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>

                    <span className="font-bold text-sm">
                      Debit / Credit Card
                    </span>
                  </div>

                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>

                <div className="p-4 border border-border/30 bg-background/30 rounded-2xl flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-lg">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <span className="font-bold text-sm text-muted-foreground">
                      Easypaisa / JazzCash
                    </span>
                  </div>

                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    Regional Method
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold gap-3 shadow-2xl shadow-primary/20 transition-all"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Lock className="w-6 h-6" />
              )}

              {isProcessing
                ? 'Processing...'
                : isOwner
                ? 'Activate Plan'
                : `Pay ${targetPlan.price} Now`}
            </Button>

            {!isOwner && (
              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                You&apos;ll be securely redirected to Safepay to enter your
                card details, then brought back here automatically.
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3 text-green-500" />
              {isOwner ? 'Owner Account' : 'Secure Payment via Safepay'}
            </div>

            {!isOwner && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/40 border border-border/30">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Your subscription will only be activated after
                  successful payment verification.
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full rounded-2xl gap-2 font-bold text-muted-foreground hover:text-primary"
          onClick={() => router.back()}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Summary
        </Button>
      </div>
    </div>
  );
}