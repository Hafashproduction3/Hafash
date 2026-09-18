"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  X,
  Zap,
  Shield,
  MessageSquare,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getPermissionStatus,
  isFCMSupported,
  setupFCM,
} from "@/lib/fcm";

const DISMISS_KEY = "hafash_notification_dismissed";

export function NotificationPermission() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [show, setShow] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [alreadyEnabled, setAlreadyEnabled] = useState(false);

  useEffect(() => {
    if (!user || !firestore) return;

    const status = getPermissionStatus();

    // Agar permission already "granted" hai — popup KABHI nahi dikhao
    if (status === "granted") {
      setAlreadyEnabled(true);
      setupFCM(firestore, user.uid).catch(() => {});
      return;
    }

    // Agar permission "denied" hai — popup mat dikhao
    if (status === "denied") {
      setAlreadyEnabled(true);
      return;
    }

    // Agar user ne "Later" dabaya tha (1 din) — popup mat dikhao
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < 1) return;   // ← 1 din
    }

    // Sirf "default" status pe popup dikhao
    isFCMSupported().then((supported) => {
      if (supported) {
        setTimeout(() => setShow(true), 3000);
      }
    });
  }, [user, firestore]);

  const handleEnable = async () => {
    if (!user || !firestore) return;
    setIsEnabling(true);

    try {
      const success = await setupFCM(firestore, user.uid);

      if (success) {
        toast({
          title: "🎉 Notifications Enabled!",
          description: "Ab aapko Hafash par updates milti rahengi.",
        });
        setAlreadyEnabled(true);
        setShow(false);
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.error("[PERMISSION] Error:", err);
      handleDismiss();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show || alreadyEnabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <Card className="relative overflow-hidden rounded-3xl border-primary/30 bg-gradient-to-br from-card/98 via-card/95 to-background shadow-2xl backdrop-blur-2xl">
        <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-background/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <CardContent className="relative p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary animate-[wiggle_1s_ease-in-out_infinite]" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-card animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h3 className="font-headline font-bold text-base text-white leading-tight">
                Enable Notifications?
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Real-time updates — cross requests, messages, reviews — sab foran.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <FeatureRow icon={<Zap className="w-3.5 h-3.5" />} text="Instant cross requests alerts" />
            <FeatureRow icon={<MessageSquare className="w-3.5 h-3.5" />} text="New messages & reviews" />
            <FeatureRow icon={<Shield className="w-3.5 h-3.5" />} text="Kabhi koi kaam miss nahi hoga" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-xl h-11 text-xs font-bold text-muted-foreground hover:bg-background/50"
              onClick={handleDismiss}
              disabled={isEnabling}
            >
              Later
            </Button>

            <Button
              className="flex-1 rounded-xl h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 gap-1.5 group"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  Allow
                </>
              )}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
            Enable karein taake aapko Hafash ki notifications milti rahein
          </p>
        </CardContent>

        <style jsx global>{`
          @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-12deg); }
            75% { transform: rotate(12deg); }
          }
        `}</style>
      </Card>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground font-medium">{text}</p>
    </div>
  );
}