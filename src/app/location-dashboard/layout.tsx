"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { LocationSidebar } from '@/components/location/LocationSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { NotificationBell } from '@/components/network/NotificationBell';
import { NotificationPermission } from '@/components/network/NotificationPermission';

export default function LocationDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userRef);

  useEffect(() => {
    if (!loading && !profileLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.emailVerified) {
        router.push('/verify-email');
      } else if (profile && profile.role !== 'location-owner') {
        // Agar photographer hai, to dashboard pe bhejo
        router.push('/dashboard');
      }
    }
  }, [user, loading, profile, profileLoading, router]);

  if (loading || !user || !user.emailVerified || profileLoading) {
    return <HafashLoader text="Authenticating Location Workspace..." />;
  }

  if (profile && profile.role !== 'location-owner') {
    return <HafashLoader text="Redirecting..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <LocationSidebar />
      <MobileNav />
      <main className="flex-1 lg:overflow-y-auto">

        {/* TOP BAR (Bell Icon) */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/30 lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex items-center justify-end h-16 lg:h-20">
            <NotificationBell />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="p-6 lg:p-12 lg:pt-4">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <NotificationPermission />
    </div>
  );
}