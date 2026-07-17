"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { 
  CreditCard, 
  Search, 
  ArrowUpDown, 
  ExternalLink, 
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PaymentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const filteredPayments = useMemo(() => {
    if (!galleries) return [];
    let filtered = [...galleries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => (g.clientName || "").toLowerCase().includes(q) || (g.title || "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(g => !!g.isPaid === (statusFilter === "paid"));
    }
    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return filtered;
  }, [galleries, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const safeGalleries = galleries || [];
    return {
      paid: safeGalleries.filter(g => g.isPaid).length,
      unpaid: safeGalleries.filter(g => !g.isPaid).length
    };
  }, [galleries]);

  const handleMarkAsPaid = useCallback(async (galleryId: string) => {
    if (!firestore) return;
    setIsUpdating(galleryId);
    try {
      const docRef = doc(firestore, 'galleries', galleryId);
      await updateDoc(docRef, { isPaid: true, isLocked: false });
      toast({ title: "Payment Confirmed", description: "Gallery marked as paid and downloads unlocked." });
    } finally {
      setIsUpdating(null);
    }
  }, [firestore, toast]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold">Payments & Revenue</h1>
            <p className="text-muted-foreground mt-2 text-xs lg:text-sm">Manage studio billing and track fees.</p>
          </div>
        </div>
        <div className="hidden lg:flex bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 items-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Revenue Sync Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Paid</p>
            {dataLoading && !galleries ? <Skeleton className="h-8 w-12 mt-1" /> : <h3 className="text-3xl font-headline font-bold text-green-500">{stats.paid}</h3>}
          </div>
          <CheckCircle2 className="w-6 h-6 text-green-500 opacity-20" />
        </Card>
        <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Unpaid</p>
            {dataLoading && !galleries ? <Skeleton className="h-8 w-12 mt-1" /> : <h3 className="text-3xl font-headline font-bold text-amber-500">{stats.unpaid}</h3>}
          </div>
          <Clock className="w-6 h-6 text-amber-500 opacity-20" />
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search payments..." 
            className="pl-10 h-12 bg-card/50 rounded-xl" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="lg:w-[160px] h-12 rounded-xl text-[10px] uppercase font-bold"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-6">Client & Gallery</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading && !galleries ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-16 w-full rounded-lg" /></TableCell></TableRow>
                ))
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center italic opacity-40">No records found.</TableCell></TableRow>
              ) : (
                filteredPayments.map((gallery) => (
                  <TableRow key={gallery.id}>
                    <TableCell className="py-6">
                      <p className="font-bold text-lg">{gallery.clientName || "Untitled"}</p>
                      <span className="text-[10px] text-muted-foreground truncate">{gallery.title}</span>
                    </TableCell>
                    <TableCell className="text-primary font-bold">Rs. 5,000</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[8px] uppercase tracking-widest px-3 py-1", gallery.isPaid ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500")}>
                        {gallery.isPaid ? "Paid" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!gallery.isPaid && (
                        <Button size="sm" className="rounded-lg text-[10px]" onClick={() => handleMarkAsPaid(gallery.id)} disabled={isUpdating === gallery.id}>
                          {isUpdating === gallery.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Paid"}
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
    </div>
  );
}
