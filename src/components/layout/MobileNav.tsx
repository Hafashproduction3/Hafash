
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, LayoutDashboard, PlusCircle, Heart, HardDrive, Settings, Package, Users, CreditCard, MessageSquare } from 'lucide-react';
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

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const usageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);
  const usagePercent = useMemo(() => {
    return Math.min((usageGb / currentPlan.storageGb) * 100, 100);
  }, [usageGb, currentPlan.storageGb]);

  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2">
        <img src="/hafash-logo.png" alt="Hafash Logo" className="w-8 h-8 object-contain" />
        <span className="text-xl font-headline font-bold text-primary italic">Hafash.pk</span>
      </Link>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-card border-r border-border/50 p-0 flex flex-col w-72">
          <SheetHeader className="p-6 border-b border-border/20 text-left">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <img src="/hafash-logo.png" alt="Hafash Logo" className="w-12 h-12 object-contain" />
              <SheetTitle className="text-2xl font-headline font-bold text-primary italic">Hafash.pk</SheetTitle>
            </Link>
          </SheetHeader>
          
          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
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

          <div className="p-6 border-t border-border/50 space-y-6">
            <div className="bg-background/50 p-4 rounded-xl border border-border/50">
              <div className="flex items-center justify-between text-[10px] mb-2 font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">Storage</span>
                <span className="text-primary">{usageGb.toFixed(1)}GB / {currentPlan.storageGb}GB</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
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
