"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { HafashLoader } from "@/components/ui/hafash-loader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}