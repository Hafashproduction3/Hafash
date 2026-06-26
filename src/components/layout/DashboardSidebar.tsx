
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
  { icon: Heart, label: 'Favorites & Workflow', href: '/favorites' },
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
      {/* Premium Branding Section */}
      <div className="py-16 px-4 flex flex-col items-center justify-center border-b border-border/20">
        <Link href="/dashboard" className="group flex flex-col items-center text-center">
          <img 
            src="/hafash-logo.png" 
            alt="Hafash Logo" 
            className="h-[80px] w-auto drop-shadow-[0_15px_20px_rgba(0,0,0,0.6)] transition-all duration-700 group-hover:scale-105 mb-6" 
          />
          <div className="space-y-2">
            <span className="block text-4xl font-headline font-bold text-primary tracking-tighter uppercase leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
              HAFASH.PK
            </span>
            <span className="block text-[12px] uppercase tracking-[0.4em] font-bold text-muted-foreground/60 leading-tight px-2">
              Professional Photography Platform
            </span>
          </div>
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
