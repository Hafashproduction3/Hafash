"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Image as ImageIcon, CreditCard, HardDrive, UserPlus, ArrowRight } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, getCountFromServer, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";

const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  try {
    const d = typeof dateVal === 'object' && dateVal.seconds 
      ? new Date(dateVal.seconds * 1000) 
      : new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM d, yyyy');
  } catch { return 'N/A'; }
};

export default function AdminDashboard() {
  const firestore = useFirestore();
  const [stats, setStats] = useState({
    users: 0,
    galleries: 0,
    loading: true
  });

  // Recent Signups Query
  const recentUsersQuery = useMemo(() => {
    if (!firestore) return null;
    // Maan lete hain ke naye users ke paas createdAt hota hai
    return query(collection(firestore, "users"), limit(5)); 
  }, [firestore]);

  const { data: recentUsers, loading: recentLoading } = useCollection(recentUsersQuery);

  useEffect(() => {
    async function fetchStats() {
      if (!firestore) return;
      try {
        const usersRef = collection(firestore, "users");
        const galleriesRef = collection(firestore, "galleries");

        const [usersSnap, galleriesSnap] = await Promise.all([
          getCountFromServer(usersRef),
          getCountFromServer(galleriesRef)
        ]);

        setStats({
          users: usersSnap.data().count,
          galleries: galleriesSnap.data().count,
          loading: false
        });
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    }
    fetchStats();
  }, [firestore]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-headline font-bold text-white mb-2">Platform Overview</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here is what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats.loading ? "..." : stats.users.toString()} 
          icon={Users} 
        />
        <StatCard 
          title="Total Galleries" 
          value={stats.loading ? "..." : stats.galleries.toString()} 
          icon={ImageIcon} 
        />
        <StatCard 
          title="Revenue" 
          value="Rs. 0" 
          icon={CreditCard} 
        />
        <StatCard 
          title="Storage Used" 
          value="0 GB" 
          icon={HardDrive} 
        />
      </div>

      {/* Recent Signups Section */}
      <div className="mt-12 bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Recent Signups
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Latest studios that joined your platform.</p>
          </div>
          <Link 
            href="/admin/users" 
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="divide-y divide-border/50">
          {recentLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading users...</div>
          ) : !recentUsers || recentUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
          ) : (
            recentUsers.map((user: any) => (
              <div key={user.userId || user.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(user.studioName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{user.studioName || user.photographerName || "No Name"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${
                    (!user.planId || user.planId === 'none') ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                  }`}>
                    {user.planId || 'none'}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">{safeFormatDate(user.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-card border border-border/50 p-6 rounded-2xl flex flex-col gap-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <h3 className="text-3xl font-headline font-bold text-white">{value}</h3>
    </div>
  );
}