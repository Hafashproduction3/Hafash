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
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: galleries, loading: dataLoading } = useCollection(galleriesQuery);

  const filteredClients = useMemo(() => {
    if (!galleries) return [];
    let filtered = [...galleries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => (g.clientName || "").toLowerCase().includes(q) || (g.title || "").toLowerCase().includes(q));
    }
    if (paymentFilter !== "all") {
      filtered = filtered.filter(g => !!g.isPaid === (paymentFilter === "paid"));
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(g => g.category === categoryFilter);
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [galleries, searchQuery, paymentFilter, categoryFilter, sortOrder]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold">Client Management</h1>
            <p className="text-muted-foreground mt-2 text-xs lg:text-sm">Manage your luxury studio's client database.</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{dataLoading && !galleries ? '...' : filteredClients.length} Total Clients</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-10 h-12 bg-card/50 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 lg:flex items-center gap-3">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="lg:w-[140px] h-12 rounded-xl text-[10px] uppercase font-bold"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Pending</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}><ArrowUpDown className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-6">Client & Event</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading && !galleries ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-16 w-full rounded-lg" /></TableCell></TableRow>
                ))
              ) : filteredClients.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center italic opacity-40">No clients found.</TableCell></TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="group transition-colors">
                    <TableCell className="py-6 min-w-[200px]">
                      <p className="font-bold text-lg">{client.clientName || "Untitled"}</p>
                      <Badge variant="outline" className="text-[8px] uppercase font-bold border-primary/30 text-primary">{client.category}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2"><Mail className="w-3 h-3" /> {client.clientEmail || "N/A"}</p>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <p className="text-[10px] font-bold uppercase"><Calendar className="w-3 h-3 inline mr-2 text-primary" /> {client.date}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", client.isPaid ? "bg-green-500" : "bg-amber-500")} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{client.isPaid ? "Paid" : "Pending"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/events/${client.id}/manage`}><Button size="sm" className="rounded-lg h-9 gap-2">Manage <ChevronRight className="w-3 h-3" /></Button></Link>
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
