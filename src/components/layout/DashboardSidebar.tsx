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
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useCallback } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

const navItems = [
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
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries } = useCollection(galleriesQuery);

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc(profileRef);

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const usageStats = useMemo(() => {
    const usageGb = calculateUsageGb(galleries);
    const usagePercent = Math.min((usageGb / currentPlan.storageGb) * 100, 100);
    return { usageGb, usagePercent };
  }, [galleries, currentPlan.storageGb]);

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
        {navItems.map((item) => {
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
      </nav>

      <div className="p-6 border-t border-border/50 space-y-4">
        <div className="bg-background/50 p-4 rounded-xl border border-border/50 shadow-inner">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-2">
            <span className="text-muted-foreground">Storage</span>
            <span className="text-primary">{usageStats.usageGb.toFixed(1)}GB / {currentPlan.storageGb}GB</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${usageStats.usagePercent}%` }} />
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