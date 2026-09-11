"use client";

import { useStore } from '@/lib/store';
import { CreditCard, Search, ArrowLeft, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function TestDrivePaymentsPage() {
  const { events, updateEvent } = useStore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(g => (g.clientName || "").toLowerCase().includes(q) || (g.title || "").toLowerCase().includes(q));
  }, [events, searchQuery]);

  const stats = useMemo(() => ({
    paid: events.filter(g => g.isPaid).length,
    unpaid: events.filter(g => !g.isPaid).length
  }), [events]);

  const handleMarkPaid = (id: string) => {
    updateEvent(id, { isPaid: true, isLocked: false });
    toast({ title: "Simulation", description: "Payment confirmed. Downloads unlocked." });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-white">Test Payments</h1>
            <p className="text-muted-foreground mt-2">Manage simulated studio billing.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Revenue Simulation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/30 border-border/30 p-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Paid Orders</p>
            <h3 className="text-4xl font-headline font-bold text-green-500 mt-1">{stats.paid}</h3>
          </div>
          <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20" />
        </Card>
        <Card className="bg-card/30 border-border/30 p-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Awaiting</p>
            <h3 className="text-4xl font-headline font-bold text-amber-500 mt-1">{stats.unpaid}</h3>
          </div>
          <Clock className="w-10 h-10 text-amber-500 opacity-20" />
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search test payments..." 
          className="pl-10 h-12 bg-card/50 rounded-xl text-white border-border/50" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="py-6 text-muted-foreground">Order Details</TableHead>
              <TableHead className="text-muted-foreground">Amount (Sim)</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-64 text-center italic opacity-40 text-white">No payment records.</TableCell></TableRow>
            ) : (
              filtered.map((g) => (
                <TableRow key={g.id} className="border-border/30">
                  <TableCell className="py-6">
                    <p className="font-bold text-white">{g.clientName || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{g.title}</p>
                  </TableCell>
                  <TableCell className="text-primary font-bold">Rs. 5,000</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[8px] uppercase tracking-widest px-3 py-1", g.isPaid ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30")}>
                      {g.isPaid ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!g.isPaid && (
                      <Button size="sm" className="rounded-lg font-bold" onClick={() => handleMarkPaid(g.id)}>
                        Confirm Payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}