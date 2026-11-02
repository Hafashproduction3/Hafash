"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Loader2, CreditCard, ArrowUpRight, TrendingUp, AlertCircle } from "lucide-react";

// Safe date formatter
const safeDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  try {
    const d = typeof dateVal === 'object' && dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM d, yyyy • h:mm a');
  } catch { return 'N/A'; }
};

export default function AdminPaymentsPage() {
  const firestore = useFirestore();
  const [search, setSearch] = useState("");

  // Firestore se payments fetch karein
  const paymentsQuery = useMemo(() => {
    if (!firestore) return null;
    // Yahan hum maan rahe hain ke aapke paas 'payments' naam ka collection hai
    // Jo Safepay webhook se data save karta hai
    return query(collection(firestore, "payments"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore]);

  const { data: payments, loading } = useCollection(paymentsQuery);

  // Filter karein (Search bar ke zariye)
  const filteredPayments = payments?.filter((p: any) => 
    p.email?.toLowerCase().includes(search.toLowerCase()) || 
    p.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    p.planId?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Total Revenue Calculate karein (Sirf successful payments)
  const totalRevenue = useMemo(() => {
    if (!payments) return 0;
    return payments
      .filter((p: any) => p.status === 'succeeded' || p.status === 'paid' || p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1">Payments & Revenue</h1>
        <p className="text-muted-foreground text-sm">Track your platform's earnings and transaction history.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</p>
          </div>
          <h3 className="text-4xl font-headline font-bold text-primary">
            Rs. {loading ? "..." : totalRevenue.toLocaleString()}
          </h3>
        </div>

        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Successful Payments</p>
          </div>
          <h3 className="text-4xl font-headline font-bold text-white">
            {loading ? "..." : payments?.filter((p:any) => p.status === 'succeeded' || p.status === 'paid').length || 0}
          </h3>
        </div>

        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Failed/Pending</p>
          </div>
          <h3 className="text-4xl font-headline font-bold text-white">
            {loading ? "..." : payments?.filter((p:any) => p.status !== 'succeeded' && p.status !== 'paid').length || 0}
          </h3>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20">
          <h2 className="font-headline font-bold text-lg">Recent Transactions</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by email, order..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border/50 text-sm focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Order ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">User Email</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Plan</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Amount</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No transactions found. When users buy plans, they will appear here.
                  </td>
                </tr>
              ) : filteredPayments.map((payment: any) => (
                <tr key={payment.id || payment.orderId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {payment.orderId ? payment.orderId.slice(0, 15) + '...' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {payment.email || payment.userEmail || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase">
                      {payment.planId || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    Rs. {payment.amount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                      (payment.status === 'succeeded' || payment.status === 'paid' || payment.status === 'PAID') 
                        ? 'bg-green-500/20 text-green-500' 
                        : payment.status === 'failed' 
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {payment.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {safeDate(payment.createdAt)}
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