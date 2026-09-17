"use client";

import { NetworkNotifications } from '@/components/network/NetworkNotifications';
import { NotificationBell } from '@/components/network/NotificationBell';

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Toast notifications (real-time popups) */}
      <NetworkNotifications />

      {/* Sticky Top Bar with Bell Icon */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-end h-16">
          <NotificationBell />
        </div>
      </div>

      {/* Page Content */}
      <div className="pt-2">
        {children}
      </div>
    </>
  );
}