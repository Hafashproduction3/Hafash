
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Heart, 
  Settings, 
  LogOut,
  Camera,
  Menu,
  ShieldCheck,
  Sparkles,
  Package,
  Users,
  CreditCard,
  MessageSquare,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';

const TEST_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Test Dashboard', href: '/test-drive' },
  { icon: PlusCircle, label: 'Create Test Event', href: '/test-drive/create' },
  { icon: Users, label: 'Test Clients', href: '/test-drive/clients' },
  { icon: CreditCard, label: 'Test Payments', href: '/test-drive/payments' },
  { icon: MessageSquare, label: 'Communications', href: '/test-drive/communications' },
  { icon: Package, label: 'Album Selections', href: '/test-drive/selections' },
  { icon: Heart, label: 'Workflow Portal', href: '/test-drive/workflow' },
  { icon: HardDrive, label: 'Storage Info', href: '/test-drive/storage' },
  { icon: Settings, label: 'Demo Settings', href: '/test-drive/settings' },
];

export default function TestDriveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { events } = useStore();

  const isGalleryView = pathname?.includes('/test-drive/gallery/');

  const totalSizeMb = useMemo(() => {
    return events.reduce((acc, e) => acc + (e.items?.length || 0) * 12.5, 0);
  }, [events]);

  const usagePercent = Math.min((totalSizeMb / 50000) * 100, 100);

  // If we are in the gallery client view, do not wrap in the dashboard layout
  if (isGalleryView) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col shadow-2xl">
        <div className="p-8 border-b border-border/20 text-center">
          <Link href="/" className="flex flex-col items-center gap-2 group">
            <img src="/hafash-logo.png" alt="Hafash" className="h-12 w-auto transition-transform group-hover:scale-105" />
            <span className="text-2xl font-headline font-bold text-primary italic tracking-tighter">Hafash.pk</span>
          </Link>
        </div>
        
        <div className="px-4 py-8 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/20 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">Public Test Drive</p>
            <p className="text-[10px] text-muted-foreground italic leading-tight">No account required. All data is temporary.</p>
          </div>

          <nav className="space-y-1">
            {TEST_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300",
                    pathname === item.href && "bg-primary/10 text-primary font-bold shadow-inner"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-border/50 space-y-4">
          <div className="bg-background/50 p-4 rounded-xl border border-border/50 shadow-inner">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-2">
              <span className="text-muted-foreground">Test Capacity</span>
              <span className="text-primary">{totalSizeMb.toFixed(0)}MB / 50GB</span>
            </div>
            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
          
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 h-11 rounded-xl font-bold text-sm">
              <LogOut className="w-5 h-5" /> Exit Test Mode
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background sticky top-0 z-50 h-20">
        <Link href="/test-drive" className="flex items-center gap-2">
          <img src="/hafash-logo.png" alt="Logo" className="h-10 w-auto" />
          <span className="text-xl font-headline font-bold text-primary italic tracking-tighter">Hafash.pk</span>
        </Link>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 h-12 w-12 rounded-full"><Menu className="w-7 h-7" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r border-border/50 p-0 flex flex-col w-72 lg:w-80">
            <SheetHeader className="p-6 border-b border-border/20 text-left">
              <SheetTitle className="text-2xl font-headline font-bold text-primary italic tracking-tighter">Hafash Test Drive</SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
              {TEST_NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className={cn(
                    "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 text-sm",
                    pathname === item.href && "bg-primary/10 text-primary font-bold"
                  )}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
            <div className="p-6 border-t border-border/50">
              <Link href="/">
                <Button variant="ghost" className="w-full justify-start gap-3 text-destructive h-12 rounded-xl font-bold">
                  <LogOut className="w-5 h-5" /> Exit Test Drive
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
