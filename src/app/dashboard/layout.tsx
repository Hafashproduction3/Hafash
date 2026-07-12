"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { HafashLoader } from '@/components/ui/hafash-loader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!user.emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, loading, router]);

  // TEMPORARY DEBUG: Force render the loader
  return (
    <HafashLoader text="TEST LOADER (DEBUG)" />
  );

  /* Original logic commented for debug session
  if (loading || !user || !user.emailVerified) {
    return (
      <HafashLoader text="Authenticating Studio Workspace..." />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <DashboardSidebar />
      <MobileNav />
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
  */
}
