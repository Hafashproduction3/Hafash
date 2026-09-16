"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Heart,
  HardDrive,
  Settings,
  LogOut,
  Package,
  Users,
  CreditCard,
  MessageSquare,
  Search,
  CalendarDays,
  ChevronDown,
  UserCircle,
  Send,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

const MENU_SECTIONS = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', priority: true },
      { icon: Users, label: 'Clients', href: '/clients', priority: true },
    ],
  },
  {
    label: 'Studio',
    items: [
      { icon: MessageSquare, label: 'Communications', href: '/communications', priority: false },
      { icon: Package, label: 'Album Selections', href: '/album-selections', priority: true },
      { icon: Heart, label: 'Workflow Portal', href: '/favorites', priority: true },
    ],
  },
  {
    label: 'Billing',
    items: [
      { icon: CreditCard, label: 'Payments', href: '/payments', priority: true },
      { icon: HardDrive, label: 'Storage', href: '/storage', priority: true },
      { icon: Settings, label: 'Settings', href: '/settings', priority: false },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [networkOpen, setNetworkOpen] = useState(pathname.startsWith('/network'));

  useEffect(() => {
    if (pathname.startsWith('/network')) {
      setNetworkOpen(true);
    }
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been logged out of your studio.",
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

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'galleries'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: galleries } = useCollection(galleriesQuery);

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc(profileRef);

  const incomingQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('professionalId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [firestore, user?.uid]);

  const { data: incomingRequests } = useCollection(incomingQuery);
  const newRequestsCount = incomingRequests?.length || 0;

  const networkProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'networkProfiles', user.uid);
  }, [firestore, user?.uid]);

  const { data: myNetworkProfile } = useDoc(networkProfileRef);
  const hasNetworkProfile = !!myNetworkProfile;

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const usageStats = useMemo(() => {
    const usageGb = calculateUsageGb(galleries);
    const usagePercent = currentPlan.storageGb > 0
      ? Math.min((usageGb / currentPlan.storageGb) * 100, 100)
      : 0;
    return { usageGb, usagePercent };
  }, [galleries, currentPlan.storageGb]);

  const networkActive = pathname.startsWith('/network');

  const networkItems = [
    { icon: Search, label: 'Find Professionals', href: '/network', exact: true },
    {
      icon: UserCircle,
      label: hasNetworkProfile ? 'My Profile' : 'Create Profile',
      href: hasNetworkProfile ? `/network/professional/${user?.uid}` : '/network/join',
    },
    { icon: Send, label: 'My Requests', href: '/network/requests' },
    {
      icon: Inbox,
      label: 'Incoming',
      href: '/network/incoming',
      badge: newRequestsCount > 0 ? newRequestsCount : null,
    },
    { icon: MessageSquare, label: 'Messages', href: '/network/messages' },
    { icon: CalendarDays, label: 'My Availability', href: '/network/availability' },
  ];

  return (
    <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col">

      {/* ═══ ORIGINAL LOGO ═══ */}
      <div className="p-8 border-b border-border/20">
        <Link
          href="/dashboard"
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
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <nav className="flex-1 px-4 py-6 space-y-5 overflow-y-auto custom-scrollbar">

        {MENU_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50 mb-2">
              {section.label}
            </p>

            {section.items.map((item) => {
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
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        ))}

        {/* ═══ HAFASH NETWORK Section ═══ */}
        <div className="pt-3 border-t border-border/30">
          <button
            type="button"
            onClick={() => setNetworkOpen((open) => !open)}
            className="w-full px-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50 hover:text-primary/70 transition-colors mb-2"
          >
            <span>Marketplace</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform duration-300",
              networkOpen && "rotate-180"
            )} />
          </button>

          <Link href="/network/hub">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 rounded-xl transition-all duration-300 text-[13px]",
                networkActive
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="flex-1 text-left">Hafash Network</span>
              {newRequestsCount > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {newRequestsCount > 9 ? '9+' : newRequestsCount}
                </span>
              )}
            </Button>
          </Link>

          {networkOpen && (
            <div className="ml-5 mt-1 pl-4 border-l border-border/50 space-y-0.5 animate-in slide-in-from-top-2 duration-300">
              {networkItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-9 rounded-lg text-[12px] transition-all",
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>

                      {item.badge != null && item.badge > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* ═══ FOOTER ═══ */}
      <div className="p-5 border-t border-border/50 space-y-3">
        <div className="bg-background/50 p-3 rounded-xl border border-border/50">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1.5">
            <span className="text-muted-foreground">Storage</span>
            <span className={cn(
              "text-primary",
              usageStats.usagePercent >= 90 && "text-destructive"
            )}>
              {usageStats.usageGb.toFixed(1)} / {currentPlan.storageGb} GB
            </span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                usageStats.usagePercent >= 90 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${usageStats.usagePercent}%` }}
            />
          </div>
        </div>

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