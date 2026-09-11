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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';

const TEST_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Test Dashboard', href: '/test-drive' },
  { icon: PlusCircle, label: 'Create Test Event', href: '/test-drive/create' },
  { icon: Heart, label: 'Test Workflow', href: '/test-drive/workflow' },
  { icon: Settings, label: 'Demo Settings', href: '/test-drive/settings' },
];

export default function TestDriveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="w-72 border-r border-border/50 h-screen bg-card sticky top-0 hidden lg:flex flex-col shadow-2xl">
        <div className="p-8 border-b border-border/20">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/hafash-logo.png" alt="Hafash" className="h-12 w-auto transition-transform group-hover:scale-105" />
            <span className="text-2xl font-headline font-bold text-primary italic tracking-tighter">Hafash.pk</span>
          </Link>
        </div>
        
        <div className="px-6 py-8 flex-1 space-y-2">
          <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/20 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">Public Test Drive</p>
            <p className="text-xs text-muted-foreground italic">No account required. Your data is temporary.</p>
          </div>

          <nav className="space-y-1">
            {TEST_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-14 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300",
                    pathname === item.href && "bg-primary/10 text-primary font-bold shadow-inner"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-widest">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-border/50">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-4 text-destructive hover:bg-destructive/10 h-12 rounded-2xl">
              <LogOut className="w-5 h-5" /> Exit Test Mode
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <img src="/hafash-logo.png" alt="Logo" className="h-10 w-auto" />
          <span className="text-xl font-headline font-bold text-primary italic">Hafash.pk</span>
        </Link>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary"><Menu className="w-7 h-7" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r border-border/50 p-0 flex flex-col w-80">
            <SheetHeader className="p-6 border-b border-border/20 text-left">
              <SheetTitle className="text-2xl font-headline font-bold text-primary italic">Test Drive Mode</SheetTitle>
            </SheetHeader>
            <nav className="flex-1 p-4 space-y-1">
              {TEST_NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl text-sm uppercase tracking-widest">{item.label}</Button>
                </Link>
              ))}
            </nav>
            <div className="p-6 border-t border-border/50">
              <Link href="/">
                <Button variant="ghost" className="w-full justify-start gap-4 text-destructive h-12">Exit Test Drive</Button>
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
