'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Heart,
  HardDrive,
  Settings,
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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth, useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { collection, query, where, doc } from 'firebase/firestore';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: PlusCircle, label: 'Create Event', href: '/events/create' },
  { icon: Users, label: 'Clients', href: '/clients' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: MessageSquare, label: 'Communications', href: '/communications' },
  { icon: Package, label: 'Album Selections', href: '/album-selections' },
  { icon: Heart, label: 'Workflow Portal', href: '/favorites' },
  { icon: HardDrive, label: 'Storage', href: '/storage' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Auto-expand network if on network page
  useEffect(() => {
    if (pathname.startsWith('/network')) {
      setNetworkOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setOpen(false);
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
  };

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries } = useCollection(galleriesQuery);

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc(profileRef);

  // Incoming requests count (for badge)
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

  // Check if user has network profile
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

  const usageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);
  const usagePercent = useMemo(() => {
    if (currentPlan.storageGb <= 0) return 0;
    return Math.min((usageGb / currentPlan.storageGb) * 100, 100);
  }, [usageGb, currentPlan.storageGb]);

  const networkItems = [
    {
      icon: Search,
      label: 'Find Professionals',
      href: '/network',
      exact: true,
    },
    {
      icon: UserCircle,
      label: hasNetworkProfile ? 'My Profile' : 'Create Profile',
      href: hasNetworkProfile ? `/network/professional/${user?.uid}` : '/network/join',
    },
    {
      icon: Send,
      label: 'My Requests',
      href: '/network/requests',
    },
    {
      icon: Inbox,
      label: 'Incoming Requests',
      href: '/network/incoming',
      badge: newRequestsCount > 0 ? newRequestsCount : null,
    },
    {
      icon: CalendarDays,
      label: 'My Availability',
      href: '/network/availability',
    },
  ];

  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background sticky top-0 z-40 h-20">
      <Link href="/dashboard" className="flex items-center gap-2">
        <img src="/hafash-logo.png" alt="Hafash Logo" className="h-10 w-auto object-contain" />
        <span className="text-xl font-headline font-bold text-primary italic tracking-tighter">Hafash.pk</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 h-12 w-12 rounded-full relative">
            <Menu className="w-7 h-7" />
            {/* Notification dot on menu button */}
            {newRequestsCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="bg-card border-r border-border/50 p-0 flex flex-col w-72 lg:w-80">
          <SheetHeader className="p-6 border-b border-border/20 text-left">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <img src="/hafash-logo.png" alt="Hafash Logo" className="h-10 lg:h-12 w-auto object-contain" />
              <SheetTitle className="text-xl lg:text-2xl font-headline font-bold text-primary italic tracking-tighter">Hafash.pk</SheetTitle>
            </Link>
          </SheetHeader>

          <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 text-sm",
                      isActive && "bg-primary/10 text-primary font-bold"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            {/* Hafash Network Section (Mobile) */}
            <div className="pt-3 mt-3 border-t border-border/30">
              <Button
                variant="ghost"
                onClick={() => setNetworkOpen((o) => !o)}
                className={cn(
                  "w-full justify-start gap-3 h-12 rounded-xl transition-all duration-300 relative overflow-hidden",
                  pathname.startsWith('/network')
                    ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-bold border border-primary/20"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
              >
                <div className="relative flex items-center gap-3 flex-1">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    pathname.startsWith('/network') ? "bg-primary/20" : ""
                  )}>
                    <Sparkles className={cn(
                      "w-4 h-4",
                      pathname.startsWith('/network') && "text-primary"
                    )} />
                  </div>

                  <span className="text-sm flex-1 text-left">Hafash Network</span>

                  {newRequestsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}

                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-300",
                      networkOpen && "rotate-180"
                    )}
                  />
                </div>
              </Button>

              {networkOpen && (
                <div className="ml-5 mt-2 pl-4 border-l-2 border-primary/20 space-y-1 animate-in slide-in-from-top-2 duration-300">
                  {networkItems.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 h-10 rounded-lg text-xs transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-left truncate">{item.label}</span>

                          {item.badge != null && item.badge > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
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

          <div className="p-6 border-t border-border/50 space-y-6">
            <div className="bg-background/50 p-4 rounded-xl border border-border/50 shadow-inner">
              <div className="flex items-center justify-between text-[10px] mb-2 font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">Storage</span>
                <span className="text-primary">{usageGb.toFixed(1)}GB / {currentPlan.storageGb}GB</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    usagePercent >= 90 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-12 font-bold"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}