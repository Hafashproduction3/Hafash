
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PaymentsPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const filteredPayments = useMemo(() => {
    if (!galleries) return [];

    let filtered = [...galleries];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        (g.clientName || "").toLowerCase().includes(q) || 
        (g.title || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const isPaid = statusFilter === "paid";
      filtered = filtered.filter(g => !!g.isPaid === isPaid);
    }

    // Sorting by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [galleries, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!galleries) return { paid: 0, unpaid: 0, pending: 0 };
    return {
      paid: galleries.filter(g => g.isPaid).length,
      unpaid: galleries.filter(g => !g.isPaid).length,
      pending: galleries.filter(g => !g.isPaid).length,
    };
  }, [galleries]);

  const handleMarkAsPaid = async (galleryId: string) => {
    if (!firestore) return;
    setIsUpdating(galleryId);
    
    try {
      const docRef = doc(firestore, 'galleries', galleryId);
      await updateDoc(docRef, { 
        isPaid: true,
        isLocked: false // Unlocking downloads automatically when paid
      });
      toast({
        title: "Payment Confirmed",
        description: "Gallery marked as paid and downloads unlocked.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Syncing Financial Records...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold">Payments & Revenue</h1>
            <p className="text-muted-foreground mt-2">Manage your studio billing and track professional service fees.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Revenue Sync Active</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between group hover:border-primary/40 transition-all">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Paid</p>
            <h3 className="text-3xl font-headline font-bold mt-1 text-green-500">{stats.paid}</h3>
          </div>
          <div className="p-3 bg-green-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        </Card>
        <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between group hover:border-primary/40 transition-all">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Unpaid Galleries</p>
            <h3 className="text-3xl font-headline font-bold mt-1 text-amber-500">{stats.unpaid}</h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </Card>
        <Card className="bg-card/30 border-border/30 p-6 flex items-center justify-between group hover:border-primary/40 transition-all">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pending Total</p>
            <h3 className="text-3xl font-headline font-bold mt-1 text-primary">{stats.pending}</h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client or gallery..." 
            className="pl-10 h-11 bg-card/50 border-border/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-11 bg-card/50 border-border/50 rounded-xl font-bold text-[10px] uppercase tracking-wider">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="h-11 rounded-xl border-border/50 bg-card/50 text-[10px] font-bold uppercase tracking-widest gap-2"
          >
            <ArrowUpDown className="w-4 h-4" /> Export Ledger
          </Button>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6">Client & Gallery</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6">Timeline</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 text-center">Amount</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <CreditCard className="w-10 h-10 mb-2" />
                      <p className="text-sm italic font-headline">No payment records found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((gallery) => {
                  return (
                    <TableRow key={gallery.id} className="border-border/20 hover:bg-muted/10 transition-colors group">
                      <TableCell className="py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-lg">{gallery.clientName || "Untitled Client"}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-muted-foreground font-medium">{gallery.title}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            {gallery.date || "N/A"}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            Created: {gallery.createdAt ? format(new Date(gallery.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-0.5 font-bold text-primary">
                            <DollarSign className="w-3 h-3" />
                            <span>500.00</span>
                          </div>
                          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Placeholder Fee</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[8px] uppercase tracking-widest px-3 py-1 font-bold",
                            gallery.isPaid 
                              ? "bg-green-500/20 text-green-500 border-green-500/30" 
                              : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                          )}
                        >
                          {gallery.isPaid ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/gallery/${gallery.slug || gallery.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 hover:bg-primary/10 hover:text-primary" title="View Gallery">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                          {!gallery.isPaid ? (
                            <Button 
                              size="sm" 
                              className="rounded-lg h-9 gap-2 font-bold px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={() => handleMarkAsPaid(gallery.id)}
                              disabled={isUpdating === gallery.id}
                            >
                              {isUpdating === gallery.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Paid"}
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-lg h-9 gap-2 font-bold px-4 text-green-500 hover:bg-green-500/10"
                              disabled
                            >
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Insight */}
      <div className="bg-card/30 border border-border/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="font-headline font-bold text-lg">Billing Architecture</h4>
          <p className="text-sm text-muted-foreground">Status updates here automatically unlock high-resolution master assets for your clients.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-primary">{stats.paid}</p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Settled</p>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="text-center">
            <p className="text-2xl font-headline font-bold text-amber-500">{stats.unpaid}</p>
            <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Outstanding</p>
          </div>
        </div>
      </div>
    </div>
  );
}
