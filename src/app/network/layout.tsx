"use client";

import { NetworkNotifications } from '@/components/network/NetworkNotifications';

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NetworkNotifications />
      {children}
    </>
  );
}