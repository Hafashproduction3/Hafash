"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ExternalLink, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  HardDrive,
  Loader2,
  ArrowLeft,
  ChevronRight,
  MoreVertical
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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

  const filteredClients = useMemo(() => {
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

    // Payment filter
    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filtered = filtered.filter(g => !!g.isPaid === isPaid);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(g => g.category === categoryFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [galleries, searchQuery, paymentFilter, categoryFilter, sortOrder]);

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Accessing Client Registry...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 lg:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold">Client Management</h1>
            <p className="text-muted-foreground mt-2 text-xs lg:text-sm">Manage your luxury studio's client database and event history.</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{filteredClients.length} Total Clients</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client or event..." 
            className="pl-10 h-12 bg-card/50 border-border/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-3">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full lg:w-[140px] h-12 bg-card/50 border-border/50 rounded-xl font-bold text-[10px] uppercase tracking-wider">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[140px] h-12 bg-card/50 border-border/50 rounded-xl font-bold text-[10px] uppercase tracking-wider">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Wedding">Wedding</SelectItem>
              <SelectItem value="Mehndi">Mehndi</SelectItem>
              <SelectItem value="Barat">Barat</SelectItem>
              <SelectItem value="Engagement">Engagement</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-xl border-border/50 bg-card/50 col-span-2 lg:col-span-1"
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 whitespace-nowrap">Client & Event</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 whitespace-nowrap">Contact Info</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 whitespace-nowrap">Timeline</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 whitespace-nowrap">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest py-6 text-right whitespace-nowrap">Gallery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users className="w-10 h-10 mb-2" />
                      <p className="text-sm italic font-headline">No clients found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const storageUsed = (client.items?.length || 0) * 8 / 1024; // GB estimation
                  return (
                    <TableRow key={client.id} className="border-border/20 hover:bg-muted/10 transition-colors group">
                      <TableCell className="py-6 min-w-[200px]">
                        <div className="space-y-1">
                          <p className="font-bold text-base lg:text-lg">{client.clientName || "Untitled Client"}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-bold border-primary/30 text-primary">
                              {client.category}
                            </Badge>
                            <span className="text-[10px] lg:text-xs text-muted-foreground font-medium truncate max-w-[120px]">{client.title}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 min-w-[180px]">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2 text-[10px] lg:text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 text-primary" /> {client.clientEmail || "No Email"}
                          </p>
                          <p className="flex items-center gap-2 text-[10px] lg:text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 text-primary" /> {client.clientPhone || "No Phone"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 min-w-[150px]">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3 text-primary" /> {client.date}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            Added: {client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 min-w-[150px]">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", client.isPaid ? "bg-green-500" : "bg-amber-500")} />
                            <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">
                              {client.isPaid ? "Payment Received" : "Pending Payment"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-mono text-muted-foreground">
                              {storageUsed.toFixed(2)} GB Used
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-right">
                        <div className="flex justify-end gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/gallery/${client.slug || client.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 hover:bg-primary/10 hover:text-primary">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/events/${client.id}/manage`}>
                            <Button size="sm" className="rounded-lg h-9 gap-2 font-bold px-3 lg:px-4 text-[10px] lg:text-xs">
                              Manage <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
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
      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 hidden sm:flex">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-headline font-bold uppercase tracking-widest">Revenue Tracking</h4>
            <p className="text-xs text-muted-foreground italic">Total pending payments: {filteredClients.filter(c => !c.isPaid).length} clients</p>
          </div>
        </div>
        <Button variant="outline" className="w-full sm:w-auto rounded-xl border-primary/30 text-primary font-bold hover:bg-primary/5" onClick={() => setPaymentFilter("unpaid")}>
          View Pending Only
        </Button>
      </div>
    </div>
  );
}
