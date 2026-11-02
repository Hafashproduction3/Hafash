"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Image as ImageIcon, 
  CreditCard, History, Settings, ArrowLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users & Plans", href: "/admin/users", icon: Users },
  { name: "Galleries", href: "/admin/galleries", icon: ImageIcon },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border/50 h-screen sticky top-0 flex flex-col hidden lg:flex">
      <div className="h-20 flex items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 text-primary font-headline font-bold text-xl italic">
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Super Admin Panel
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">Hafash.pk Admin</p>
      </div>
    </aside>
  );
}