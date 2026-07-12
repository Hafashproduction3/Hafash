"use client";

import { useFirestore, useUser, useCollection } from '@/firebase';
import { 
  MessageSquare, 
  Send, 
  History, 
  FileText, 
  Mail, 
  Phone, 
  Search, 
  Filter, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Bell,
  ChevronRight,
  MoreVertical,
  Plus
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { HafashLoader } from '@/components/ui/hafash-loader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const DEFAULT_TEMPLATES = [
  { id: 'gallery-ready', title: 'Gallery Ready', content: 'Hi {{clientName}}, your beautiful memories from {{eventName}} are ready to view! Check them out here: {{galleryUrl}}' },
  { id: 'payment-reminder', title: 'Payment Reminder', content: 'Hi {{clientName}}, this is a friendly reminder regarding the outstanding payment for your {{eventName}} gallery. You can pay here: {{paymentUrl}}' },
  { id: 'album-reminder', title: 'Album Selection Reminder', content: 'Hi {{clientName}}, we haven\'t received your photo selections for your album yet. Please heart your favorites in the gallery: {{galleryUrl}}' },
  { id: 'thank-you', title: 'Thank You', content: 'Hi {{clientName}}, it was a pleasure covering your {{eventName}}. We hope you love the photos! Please let us know if you need anything else.' },
  { id: 'downloads-enabled', title: 'Downloads Enabled', content: 'Hi {{clientName}}, your high-resolution downloads are now active! You can download your full gallery here: {{galleryUrl}}' }
];

export default function CommunicationsPage() {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("clients");

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

  const templatesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'communication_templates'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: customTemplates, loading: templatesLoading } = useCollection(templatesQuery);

  const templates = useMemo(() => {
    if (!customTemplates || customTemplates.length === 0) return DEFAULT_TEMPLATES;
    return customTemplates;
  }, [customTemplates]);

  const filteredClients = useMemo(() => {
    if (!galleries) return [];

    let filtered = [...galleries];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        (g.clientName || "").toLowerCase().includes(q) || 
        (g.title || "").toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      if (filterStatus === "unpaid") filtered = filtered.filter(g => !g.isPaid);
      if (filterStatus === "album-pending") filtered = filtered.filter(g => g.albumStatus !== "Completed");
    }

    return filtered;
  }, [galleries, searchQuery, filterStatus]);

  const handleAction = (type: string, clientName: string) => {
    // TODO: Integrate with Email/WhatsApp API in future implementation
    toast({
      title: "Action Initiated",
      description: `Initializing ${type} request for ${clientName}. External channel synchronization in progress.`,
    });
  };

  if (authLoading || (dataLoading && !galleries)) {
    return (
      <HafashLoader text="Accessing Studio Communication Channels..." />
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
            <h1 className="text-4xl font-headline font-bold">Communication Center</h1>
            <p className="text-muted-foreground mt-2">Manage client outreach and professional studio messaging.</p>
          </div>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Studio Flow Active</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-card/50 border border-border/50 p-1 rounded-xl">
          <TabsTrigger value="clients" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider">Clients</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider">Templates</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider">History</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by client or event..." 
                className="pl-10 h-11 bg-card/50 border-border/50 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] h-11 bg-card/50 border-border/50 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
                  <SelectItem value="album-pending">Album Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredClients.length === 0 ? (
              <Card className="bg-card/30 border-dashed border-border/50 py-32 text-center rounded-[2rem]">
                <p className="text-muted-foreground italic font-headline">No clients found matching your search.</p>
              </Card>
            ) : (
              filteredClients.map(client => (
                <Card key={client.id} className="bg-card border-border/30 rounded-[2rem] overflow-hidden group hover:border-primary/40 transition-all">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div className="lg:w-72 p-8 border-b lg:border-b-0 lg:border-r border-border/20 bg-muted/20">
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{client.category}</p>
                            <h3 className="text-xl font-headline font-bold">{client.clientName}</h3>
                          </div>
                          <div className="space-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <p className="flex items-center gap-2"><Mail className="w-3 h-3 text-primary" /> {client.clientEmail || 'N/A'}</p>
                            <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-primary" /> {client.clientPhone || 'N/A'}</p>
                          </div>
                          <Separator className="bg-border/20" />
                          <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <span className="text-[9px] font-bold text-muted-foreground uppercase">Payment</span>
                               <Badge variant={client.isPaid ? 'outline' : 'destructive'} className="text-[8px] font-bold py-0 h-4">
                                 {client.isPaid ? 'Paid' : 'Unpaid'}
                               </Badge>
                             </div>
                             <div className="flex items-center justify-between">
                               <span className="text-[9px] font-bold text-muted-foreground uppercase">Downloads</span>
                               <Badge variant={!client.isLocked ? 'outline' : 'secondary'} className="text-[8px] font-bold py-0 h-4">
                                 {!client.isLocked ? 'Unlocked' : 'Locked'}
                               </Badge>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <CommunicationActionCard 
                          title="Gallery Delivery" 
                          description="Notify client that photos are ready." 
                          status="Delivered"
                          onSend={() => handleAction('Gallery Ready', client.clientName)}
                          link={`/gallery/${client.slug || client.id}`}
                        />
                        <CommunicationActionCard 
                          title="Payment Reminder" 
                          description="Send professional invoice reminder." 
                          status={client.isPaid ? 'Received' : 'Pending'}
                          onSend={() => handleAction('Payment Reminder', client.clientName)}
                          isCompleted={client.isPaid}
                        />
                        <CommunicationActionCard 
                          title="Album Selection" 
                          description="Remind client to heart favorites." 
                          status={client.albumStatus === 'Completed' ? 'Selected' : 'Awaiting'}
                          onSend={() => handleAction('Album Selection', client.clientName)}
                          isCompleted={client.albumStatus === 'Completed'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-headline font-bold">Message Templates</h2>
            <Button className="rounded-xl gap-2 h-11 px-6 font-bold bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" /> Create Template
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(template => (
              <Card key={template.id} className="bg-card border-border/30 rounded-2xl p-6 hover:border-primary/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-widest">{template.title}</h4>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-border/20">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">{template.content}</p>
                </div>
                <div className="mt-4 flex justify-end">
                   <Button variant="link" className="text-primary text-[10px] font-bold uppercase tracking-widest">Edit Template</Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
           <Card className="bg-card/30 border-dashed border-border/50 py-40 text-center rounded-[3rem]">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground italic font-headline text-xl">No communication history recorded yet.</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 mt-4">Timeline Sync Active</p>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommunicationActionCard({ 
  title, 
  description, 
  status, 
  onSend, 
  isCompleted,
  link 
}: { 
  title: string, 
  description: string, 
  status: string, 
  onSend: () => void,
  isCompleted?: boolean,
  link?: string
}) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between",
      isCompleted ? "bg-green-500/5 border-green-500/20" : "bg-background border-border/30 hover:border-primary/40"
    )}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-widest">{title}</h4>
          <span className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
            isCompleted ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary"
          )}>
            {status}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-bold uppercase gap-2"
          onClick={onSend}
          disabled={isCompleted}
        >
          <Send className="w-3 h-3" /> Send
        </Button>
        {link && (
          <Link href={link} target="_blank">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border/50 hover:bg-primary/10">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
