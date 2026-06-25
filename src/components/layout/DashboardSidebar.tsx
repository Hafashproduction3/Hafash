"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
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

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: PlusCircle, label: 'Create Event', href: '/events/create' },
  { icon: Heart, label: 'Favorites', href: '/favorites' },
  { icon: HardDrive, label: 'Storage', href: '/storage' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
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

  return (
    <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col">
      <div className="p-8 flex items-center gap-3">
        <img src="/hafash-logo.png" alt="Hafash Platform" className="h-[48px] lg:h-[56px] w-auto" />
        <Link href="/dashboard" className="flex items-center">
          <span className="text-2xl font-headline font-bold text-primary tracking-tighter italic">Hafash.pk</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
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
            <span className="text-primary font-medium">12.5GB / 50GB</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '25%' }} />
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
