"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { Menu, X } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // User ka data fetch karein taake isAdmin check ho sake
  const userDocRef = user && firestore ? doc(firestore, "users", user.uid) : null;
  const { data: userData, loading: dataLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!authLoading && !dataLoading) {
      if (!user) {
        router.push("/login");
      } else if (userData && userData.isAdmin !== true) {
        // Agar admin nahi hai toh normal dashboard par bhej dein
        router.push("/dashboard");
      }
    }
  }, [user, userData, authLoading, dataLoading, router]);

  if (authLoading || dataLoading || !user || userData?.isAdmin !== true) {
    return <HafashLoader text="Verifying Admin Access..." />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      
      {/* ✅ Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 p-4 flex items-center justify-between">
        <div className="font-headline font-bold text-lg">Admin Panel</div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ✅ Sidebar (Mobile par slide hota hai) */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] w-64 bg-card border-r border-border/50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AdminSidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* ✅ Overlay jab mobile menu khula ho */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[55] md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* ✅ Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 