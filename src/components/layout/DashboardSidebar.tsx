"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  PlusCircle,
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
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', priority: true },
  { icon: PlusCircle, label: 'Create Event', href: '/events/create', priority: false },
  { icon: Users, label: 'Clients', href: '/clients', priority: true },
  { icon: CreditCard, label: 'Payments', href: '/payments', priority: true },
  { icon: MessageSquare, label: 'Communications', href: '/communications', priority: false },
  { icon: Package, label: 'Album Selections', href: '/album-selections', priority: true },
  { icon: Heart, label: 'Workflow Portal', href: '/favorites', priority: true },
  { icon: HardDrive, label: 'Storage', href: '/storage', priority: true },
  { icon: Settings, label: 'Settings', href: '/settings', priority: false },
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

  // Incoming pending requests count
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

  // Accepted requests (for counting unread chats)
  const hirerAcceptedQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('hirerId', '==', user.uid),
      where('status', 'in', ['accepted', 'completed'])
    );
  }, [firestore, user?.uid]);

  const profAcceptedQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'networkRequests'),
      where('professionalId', '==', user.uid),
      where('status', 'in', ['accepted', 'completed'])
    );
  }, [firestore, user?.uid]);

  const { data: hirerAccepted } = useCollection(hirerAcceptedQuery);
  const { data: profAccepted } = useCollection(profAcceptedQuery);

  const [unreadChats, setUnreadChats] = useState(0);

  // Count unread chats
  useEffect(() => {
    if (!firestore || !user) return;

    const acceptedIds = new Set<string>();
    (hirerAccepted || []).forEach((r: any) => r.id && acceptedIds.add(r.id));
    (profAccepted || []).forEach((r: any) => r.id && acceptedIds.add(r.id));

    if (acceptedIds.size === 0) {
      setUnreadChats(0);
      return;
    }

    let cancelled = false;

    async function countUnread() {
      let count = 0;
      const ids = Array.from(acceptedIds);

      await Promise.all(
        ids.map(async (chatId) => {
          try {
            const snap = await getDoc(doc(firestore!, 'networkChats', chatId));
            if (!snap.exists()) return;

            const data = snap.data();
            const lastMessageBy = data.lastMessageBy;
            const lastMessageAt = data.lastMessageAt;

            if (!lastMessageBy || lastMessageBy === user!.uid) return;

            // Check if there's an unread message
            // Determine if user is hirer or professional in this chat
            const reqSnap = await getDoc(doc(firestore!, 'networkRequests', chatId));
            if (!reqSnap.exists()) return;
            const reqData = reqSnap.data();
            const isHirer = reqData.hirerId === user!.uid;

            const readAt = isHirer ? data.readByHirerAt : data.readByProfessionalAt;

            if (!readAt) {
              count++;
            } else {
              const lastAt = lastMessageAt?.seconds || 0;
              const readAtSec = readAt?.seconds || 0;
              if (lastAt > readAtSec) count++;
            }
          } catch (e) {
            // Silent
          }
        })
      );

      if (!cancelled) setUnreadChats(count);
    }

    countUnread();

    return () => {
      cancelled = true;
    };
  }, [firestore, user, hirerAccepted, profAccepted, pathname]);

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
  const totalNetworkBadge = newRequestsCount + unreadChats;

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
      label: 'Incoming',
      href: '/network/incoming',
      badge: newRequestsCount > 0 ? newRequestsCount : null,
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/network/messages',
      badge: unreadChats > 0 ? unreadChats : null,
    },
    {
      icon: CalendarDays,
      label: 'My Availability',
      href: '/network/availability',
    },
  ];

  return (
    <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col">
      <div className="p-8 border-b border-border/20">
        <Link href="/dashboard" className="flex items-center justify-center gap-2 group">
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

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} prefetch={item.priority}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300",
                  isActive && "bg-primary/10 text-primary font-bold"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Button>
            </Link>
          );
        })}

        {/* Hafash Network Section */}
        <div className="pt-3 mt-3 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={() => setNetworkOpen((open) => !open)}
            className={cn(
              "w-full justify-start gap-3 h-12 rounded-xl transition-all duration-300 group relative overflow-hidden",
              networkActive
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-bold border border-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="relative flex items-center gap-3 flex-1">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                networkActive ? "bg-primary/20" : "bg-transparent"
              )}>
                <Sparkles className={cn(
                  "w-4 h-4 transition-all",
                  networkActive && "text-primary"
                )} />
              </div>

              <span className="text-sm flex-1 text-left">
                Hafash Network
              </span>

              {/* Total badge (requests + unread chats) */}
              {totalNetworkBadge > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {totalNetworkBadge > 9 ? '9+' : totalNetworkBadge}
                </span>
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
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-10 rounded-lg text-xs transition-all duration-200 group",
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:translate-x-1"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>

                      {item.badge != null && item.badge > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50 duration-300">
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

      <div className="p-6 border-t border-border/50 space-y-4">
        <div className="bg-background/50 p-4 rounded-xl border border-border/50 shadow-inner">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-2">
            <span className="text-muted-foreground">Storage</span>
            <span className="text-primary">
              {usageStats.usageGb.toFixed(1)}GB / {currentPlan.storageGb}GB
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
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-11 rounded-xl font-bold text-sm"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}