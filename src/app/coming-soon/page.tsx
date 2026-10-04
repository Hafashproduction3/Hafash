"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Construction, ArrowLeft, Sparkles } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <Card className="max-w-md w-full rounded-[2rem] text-center border-primary/20 bg-card/60 backdrop-blur-xl relative">
        <CardContent className="p-10 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Construction className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Coming Soon
              </span>
            </div>
            <h1 className="text-3xl font-headline font-bold">
              Shoot Locations
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hum Pakistan ke best shoot locations pe kaam kar rahe hain.
              Jald hi aap apni location list kar sakenge aur photographers
              book kar sakenge.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/dashboard">
              <Button className="w-full rounded-xl h-12 gap-2 bg-primary text-primary-foreground font-bold">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Hafash.pk — Deliver Memories Beautifully
          </p>
        </CardContent>
      </Card>
    </div>
  );
}