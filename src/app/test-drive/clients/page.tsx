"use client";

import { useStore } from '@/lib/store';
import { Users, Search, ArrowUpDown, ChevronRight, Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export default function TestDriveClientsPage() {
  const { events } = useStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(g => 
      (g.clientName || "").toLowerCase().includes(q) || 
      (g.title || "").toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-white">Test Clients</h1>
            <p className="text-muted-foreground mt-2">Manage your simulated client database.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
            {filteredClients.length} Test Contacts
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search clients..." 
          className="pl-10 h-12 bg-card/50 rounded-xl text-white border-border/50" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="py-6 text-muted-foreground">Client</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-64 text-center italic opacity-40 text-white">No test clients found.</TableCell></TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="border-border/30 hover:bg-white/5 transition-colors">
                  <TableCell className="py-6">
                    <p className="font-bold text-white">{client.clientName || "Untitled"}</p>
                    <p className="text-[10px] text-muted-foreground">Ref: {client.id}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] uppercase font-bold border-primary/30 text-primary">{client.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-[10px] text-white flex items-center gap-2"><Calendar className="w-3 h-3 text-primary" /> {client.date}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      className="rounded-lg h-9 gap-2 font-bold"
                      onClick={() => router.push(`/test-drive/manage/${client.id}`)}
                    >
                      Manage <ChevronRight className="w-3 h-3" />
                    </Button>
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