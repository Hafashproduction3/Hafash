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
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: PlusCircle, label: 'Create Event', href: '/events/create' },
  { icon: Heart, label: 'Favorites & Workflow', href: '/favorites' },
  { icon: HardDrive, label: 'Storage', href: '/storage' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
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

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const usageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);
  const usagePercent = useMemo(() => {
    return Math.min((usageGb / currentPlan.storageGb) * 100, 100);
  }, [usageGb, currentPlan.storageGb]);

  return (
    <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col">
      <div className="p-8 border-b border-border/20">
        <Link href="/dashboard" className="flex items-center justify-center gap-2 group">
          <img 
            src="/hafash-logo.png?v=2" 
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
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all",
                  isActive && "bg-primary/10 text-primary font-semibold"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-border/50 space-y-4">
        <div className="bg-background/50 p-4 rounded-xl border border-border/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Storage Used</span>
            <span className="text-primary font-medium">{usageGb.toFixed(1)}GB / {currentPlan.storageGb}GB</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
