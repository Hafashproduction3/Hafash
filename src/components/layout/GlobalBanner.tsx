"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { Megaphone, X, Sparkles } from "lucide-react";
import { useState } from "react";

export function GlobalBanner() {
  const firestore = useFirestore();
  const [dismissed, setDismissed] = useState(false);

  const settingsRef = firestore ? doc(firestore, "settings", "global") : null;
  const { data: settings } = useDoc(settingsRef);

  if (dismissed || !settings?.announcementActive || !settings?.announcement) {
    return null;
  }

  return (
    <div className="relative z-50 bg-gradient-to-r from-[#1A1916] via-[#2A241B] to-[#1A1916] border-b border-primary/20 shadow-[0_4px_30px_rgba(212,175,55,0.05)]">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-primary/10 p-1.5 rounded-lg border border-primary/20">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium text-white/90 truncate">
              <span className="text-primary font-bold mr-2 hidden sm:inline-block tracking-widest text-[10px] uppercase">
                Announcement
              </span>
              {settings.announcement}
            </p>
          </div>

          {/* Right: Sparkles + Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-3 h-3 text-primary/50 hidden md:block" />
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-primary focus:outline-none transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}