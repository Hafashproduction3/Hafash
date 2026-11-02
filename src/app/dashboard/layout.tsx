"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { NotificationBell } from '@/components/network/NotificationBell';
import { NotificationPermission } from '@/components/network/NotificationPermission';
import { stopImpersonating } from '@/lib/impersonate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // Check karein ke user admin ki tarah login hai ya nahi
    if (typeof window !== 'undefined') {
      setIsImpersonating(sessionStorage.getItem('impersonating') === 'true');
    }

    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!user.emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || !user.emailVerified) {
    return (
      <HafashLoader text="Authenticating Studio Workspace..." />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      
      {/* ═══ ADMIN BANNER ═══ */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center py-2 text-sm font-bold flex items-center justify-center gap-4 shadow-lg">
          You are logged in as {user.email}
          <button 
            onClick={() => stopImpersonating()}
            className="bg-white text-red-600 px-3 py-1 rounded-md text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
          >
            Return to Admin
          </button>
        </div>
      )}

      <DashboardSidebar />
      <MobileNav />
      <main className={`flex-1 lg:overflow-y-auto ${isImpersonating ? 'pt-12' : ''}`}>
        
        {/* ═══ TOP BAR (Bell Icon) ═══ */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/30 lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex items-center justify-end h-16 lg:h-20">
            <NotificationBell />
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="p-6 lg:p-12 lg:pt-4">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* ═══ NOTIFICATION PERMISSION POPUP ═══ */}
      <NotificationPermission />
    </div>
  );
}