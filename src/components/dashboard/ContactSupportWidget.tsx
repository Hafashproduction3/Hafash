"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export function ContactSupportWidget() {
  return (
    <Link 
      href="/dashboard/support"
      className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-2xl text-sm font-bold transition-all shadow-lg"
    >
      <LifeBuoy className="w-4 h-4 text-primary" />
      Support
    </Link>
  );
}