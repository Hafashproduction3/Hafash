"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Loader2, LogIn } from "lucide-react";
import { PlanChangeModal } from "@/components/admin/PlanChangeModal";
import { impersonateUser } from "@/lib/impersonate";

const safeFormatDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  try {
    const d = typeof dateVal === 'object' && dateVal.seconds 
      ? new Date(dateVal.seconds * 1000) 
      : new Date(dateVal);              
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
};

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser(); // Admin ki ID nikalne ke liye
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // List refresh karne ke liye key
  const [refreshKey, setRefreshKey] = useState(0);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"));
  }, [firestore, refreshKey]);

  const { data: users, loading } = useCollection(usersQuery);

  const filteredUsers = users?.filter((u: any) => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.studioName?.toLowerCase().includes(search.toLowerCase()) ||
    u.photographerName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-white mb-1">Users & Plans</h1>
          <p className="text-muted-foreground text-sm">Manage platform users and their subscriptions.</p>
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
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Studio / User</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Plan</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Expiry</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Joined</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : filteredUsers.map((user: any) => (
                <tr key={user.userId || user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{user.studioName || user.photographerName || "No Name"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                      (!user.planId || user.planId === 'none') ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                    }`}>
                      {user.planId || 'none'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {safeFormatDate(user.planExpiryDate)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {safeFormatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Manage
                      </button>
                      <button 
                        onClick={async () => {
                          if(confirm(`Login as ${user.studioName || user.email}?`)) {
                            try {
                              await impersonateUser(user.userId || user.id, adminUser?.uid || '');
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }
                        }}
                        className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors"
                        title="Login as User"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <PlanChangeModal 
          isOpen={!!selectedUser} 
          onClose={() => setSelectedUser(null)} 
          user={selectedUser}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}