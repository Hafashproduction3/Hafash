"use client";

import { useStore } from '@/lib/store';
import { MessageSquare, Send, Search, ArrowLeft, Mail, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TestDriveCommunicationsPage() {
  const { events } = useStore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(g => (g.clientName || "").toLowerCase().includes(q) || (g.title || "").toLowerCase().includes(q));
  }, [events, searchQuery]);

  const handleAction = (type: string, client: string) => {
    toast({ title: "Action Simulated", description: `Initializing ${type} for ${client}.` });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-white">Communications</h1>
            <p className="text-muted-foreground mt-2">Manage simulated client outreach.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Workflow Simulation</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by client or event..." 
          className="pl-10 h-12 bg-card/50 rounded-xl text-white border-border/50" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.length === 0 ? (
          <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
            <p className="text-muted-foreground italic font-headline text-white">No test events match your search.</p>
          </Card>
        ) : (
          filtered.map(client => (
            <Card key={client.id} className="bg-card border-border/30 rounded-[2rem] overflow-hidden group hover:border-primary/40 transition-all">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-72 p-8 border-b lg:border-b-0 lg:border-r border-border/20 bg-muted/20">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{client.category}</p>
                        <h3 className="text-xl font-headline font-bold text-white">{client.clientName}</h3>
                      </div>
                      <div className="space-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <p className="flex items-center gap-2"><Mail className="w-3 h-3 text-primary" /> {client.clientEmail || 'N/A'}</p>
                        <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-primary" /> {client.clientPhone || 'N/A'}</p>
                      </div>
                      <div className="pt-4 flex gap-2">
                        <Badge variant={client.isPaid ? 'outline' : 'destructive'} className="text-[8px] font-bold">
                          {client.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                        <Badge variant={!client.isLocked ? 'outline' : 'secondary'} className="text-[8px] font-bold">
                          {!client.isLocked ? 'Unlocked' : 'Locked'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl border border-border/30 bg-background/40 space-y-4">
                       <h4 className="font-bold text-[10px] uppercase tracking-widest text-white">Gallery Link</h4>
                       <p className="text-[10px] text-muted-foreground leading-relaxed">Simulate sending the premium access link.</p>
                       <Button size="sm" className="w-full rounded-lg font-bold gap-2 text-[10px] uppercase h-10" onClick={() => handleAction('Gallery Link', client.clientName)}>
                         <Send className="w-3 h-3" /> Send Notification
                       </Button>
                    </div>
                    <div className="p-5 rounded-2xl border border-border/30 bg-background/40 space-y-4">
                       <h4 className="font-bold text-[10px] uppercase tracking-widest text-white">Payment Request</h4>
                       <p className="text-[10px] text-muted-foreground leading-relaxed">Simulate sending an automated invoice reminder.</p>
                       <Button size="sm" className="w-full rounded-lg font-bold gap-2 text-[10px] uppercase h-10" onClick={() => handleAction('Payment Link', client.clientName)} disabled={client.isPaid}>
                         <Send className="w-3 h-3" /> Send Reminder
                       </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}