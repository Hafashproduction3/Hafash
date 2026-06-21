
"use client";

import { HardDrive, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  { 
    name: 'Starter', 
    price: '$9', 
    storage: '50GB', 
    features: ['Up to 10 Galleries', 'Basic Watermarking', 'Social Sharing', 'Mobile PWA'],
    current: true
  },
  { 
    name: 'Studio', 
    price: '$24', 
    storage: '200GB', 
    features: ['Unlimited Galleries', 'Custom Branding', 'Advanced Analytics', 'Client Favorite Sync'],
    current: false,
    highlight: true
  },
  { 
    name: 'Pro', 
    price: '$49', 
    storage: '1TB', 
    features: ['All Features', 'RAW Storage (Add-on)', 'Cloudflare R2 Direct Integration', 'Priority Concierge'],
    current: false
  },
];

export default function StoragePage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-5xl font-headline font-bold">Scaling Your Studio</h1>
        <p className="text-muted-foreground text-lg italic">Premium storage for premium craftsmanship. Never compromise on quality.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-8 lg:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-6 bg-primary/10 rounded-3xl">
              <HardDrive className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold">Current Storage Usage</h2>
              <p className="text-muted-foreground">You are using 12.5 GB of your 50 GB starter plan.</p>
            </div>
          </div>
          <div className="w-full md:w-96 space-y-3">
             <div className="flex justify-between text-sm font-bold">
               <span>25% Used</span>
               <span className="text-primary">37.5 GB Remaining</span>
             </div>
             <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border/50">
               <div className="h-full bg-primary" style={{ width: '25%' }} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <Card key={plan.name} className={`relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 ${plan.highlight ? 'ring-2 ring-primary scale-105 z-10' : ''}`}>
            {plan.highlight && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-4 py-1.5 rounded-bl-xl tracking-[0.2em]">
                Most Popular
              </div>
            )}
            <CardHeader className="text-center pt-10">
              <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-2">{plan.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-headline font-bold text-primary">{plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-lg font-bold mt-4">{plan.storage} Premium Storage</p>
            </CardHeader>
            <CardContent className="space-y-4 py-8">
              {plan.features.map(feat => (
                <div key={feat} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  <span>{feat}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pb-10">
              {plan.current ? (
                <Button className="w-full h-12 rounded-full border-primary text-primary bg-primary/10 cursor-default hover:bg-primary/10">Current Plan</Button>
              ) : (
                <Button className={`w-full h-12 rounded-full font-bold shadow-lg ${plan.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20' : 'bg-white text-black hover:bg-white/90'}`}>
                  Upgrade Now
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground opacity-60">
        <Zap className="w-4 h-4" />
        Payments secured by Hafash Luxury Finance
      </div>
    </div>
  );
}
