"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Loader2, ShieldAlert, AlertTriangle, ShieldCheck, HardDrive } from "lucide-react";
import { SuspendUserModal } from "@/components/admin/SuspendUserModal";

const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  try {
    const d = typeof dateVal === 'object' && dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM d, yyyy');
  } catch { return 'N/A'; }
};

export default function AdminSecurityPage() {
  const firestore = useFirestore();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch Users
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"));
  }, [firestore, refreshKey]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);

  // Fetch Galleries (taake har user ke photo count ka andaza laga sakein)
  const galleriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "galleries"));
  }, [firestore, refreshKey]);

  const { data: galleries } = useCollection(galleriesQuery);

  // Galleries ko users ke hisaab se count karein
  const galleryCounts = useMemo(() => {
    const counts: Record<string, { galleries: number; photos: number }> = {};
    if (galleries) {
      galleries.forEach((g: any) => {
        if (!counts[g.userId]) counts[g.userId] = { galleries: 0, photos: 0 };
        counts[g.userId].galleries += 1;
        counts[g.userId].photos += (g.photoCount || 0);
      });
    }
    return counts;
  }, [galleries]);

  const filteredUsers = users?.filter((u: any) => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.studioName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-white mb-1 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-destructive" /> Security & Risk Monitor
          </h1>
          <p className="text-muted-foreground text-sm">Monitor user activity, storage abuse, and suspend bad actors.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border/50 text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">User / Studio</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Plan</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Usage</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Risk Level</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {usersLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : filteredUsers.map((user: any) => {
                const stats = galleryCounts[user.userId || user.id] || { galleries: 0, photos: 0 };
                
                // Risk Logic: Agar naam ajeeb hai, ya photos bohot zyada hain
                let riskLevel = "Safe";
                let riskColor = "text-green-500 bg-green-500/10 border-green-500/30";
                let RiskIcon = ShieldCheck;

                const suspiciousNames = ["test", "asd", "admin", "hafash", "fake"];
                const hasSuspiciousName = suspiciousNames.some(n => user.studioName?.toLowerCase().includes(n) || user.email?.toLowerCase().includes(n));
                const hasTooManyPhotos = stats.photos > 1000; // Agar 1000 se zyada photos hen (Starter plan ke liye)
                const isSuspended = user.isSuspended === true;

                if (isSuspended) {
                  riskLevel = "Suspended";
                  riskColor = "text-destructive bg-destructive/10 border-destructive/30";
                  RiskIcon = AlertTriangle;
                } else if (hasSuspiciousName || hasTooManyPhotos) {
                  riskLevel = "Suspicious";
                  riskColor = "text-amber-500 bg-amber-500/10 border-amber-500/30";
                  RiskIcon = AlertTriangle;
                }

                return (
                  <tr key={user.userId || user.id} className={`hover:bg-white/[0.02] transition-colors ${isSuspended ? 'bg-destructive/5' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{user.studioName || user.photographerName || "No Name"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary border border-primary/20">
                        {user.planId || 'none'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HardDrive className="w-3.5 h-3.5" />
                        {stats.photos} Photos ({stats.galleries} Galleries)
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 w-fit ${riskColor}`}>
                        <RiskIcon className="w-3 h-3" />
                        {riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className={`text-xs font-bold hover:underline ${user.isSuspended ? 'text-green-500' : 'text-destructive'}`}
                      >
                        {user.isSuspended ? 'Restore' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <SuspendUserModal 
          isOpen={!!selectedUser} 
          onClose={() => setSelectedUser(null)} 
          user={selectedUser}
          onSuccess={handleRefresh} 
        />
      )}
    </div>
  );
}