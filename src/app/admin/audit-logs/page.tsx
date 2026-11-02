"use client";

import { useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";

export default function AdminAuditLogsPage() {
  const firestore = useFirestore();

  const logsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "admin_logs"), orderBy("timestamp", "desc"), limit(50));
  }, [firestore]);

  const { data: logs, loading } = useCollection(logsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">Track all admin actions across the platform.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Action</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Target</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : !logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No audit logs yet. Perform some admin actions.
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      log.action.includes('delete') ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                    }`}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-xs">{log.targetEmail || log.targetId}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{log.targetType}</p>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy HH:mm') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}