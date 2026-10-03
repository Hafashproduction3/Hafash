"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Home,
  Calendar,
  User,
  LogOut,
  Settings,
  Sparkles,
  Plus,
  MessageSquare,
  TrendingUp,
  Star,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useCallback } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';

const MENU_SECTIONS = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/location-dashboard', priority: true },
      { icon: Home, label: 'My Locations', href: '/location-dashboard/locations', priority: true },
      { icon: Calendar, label: 'Bookings', href: '/location-dashboard/bookings', priority: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: User, label: 'Profile', href: '/location-dashboard/profile', priority: true },
      { icon: Settings, label: 'Settings', href: '/location-dashboard/settings', priority: false },
    ],
  },
];

export function LocationSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been logged out.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message
      });
    }
  }, [auth, router, toast]);

  // Get owner's name
  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const ownerName = profile?.fullName || profile?.studioName || 'Owner';

  return (
    <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col">

      {/* Logo */}
      <div className="p-8 border-b border-border/20">
        <Link
          href="/location-dashboard"
          className="flex items-center justify-center gap-2 group"
        >
          <img
            src="/hafash-logo.png"
            alt="Hafash Logo"
            className="w-[64px] h-[64px] min-w-[64px] min-h-[64px] shrink-0 object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <span className="text-[24px] font-headline font-bold text-primary italic tracking-tighter">
            Hafash.pk
          </span>
        </Link>
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-primary mt-3">
          Location Owner
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-5 overflow-y-auto custom-scrollbar">
        {MENU_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50 mb-2">
              {section.label}
            </p>

            {section.items.map((item: any) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} prefetch={item.priority}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-11 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 text-[13px]",
                      isActive && "bg-primary/10 text-primary font-bold"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Quick Add Location */}
        <div className="pt-3 border-t border-border/30">
          <Link href="/locations/join">
            <Button
              className="w-full justify-start gap-3 h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-bold text-[13px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Add New Location</span>
            </Button>
          </Link>
        </div>

        {/* Info Card */}
        <div className="pt-3">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {ownerName}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Apni location ko photographers tak pohnchayein — bilkul free.
            </p>
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-5 border-t border-border/50">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-11 rounded-xl font-bold text-[13px]"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}