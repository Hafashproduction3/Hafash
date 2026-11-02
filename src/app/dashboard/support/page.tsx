"use client";

import { useState, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { LifeBuoy, Send, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createSupportTicket } from "@/app/actions/support";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // User ki apni purani tickets fetch karein
  const ticketsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "support_tickets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, user?.uid]);

  const { data: myTickets, loading: ticketsLoading } = useCollection(ticketsQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim()) return;

    setLoading(true);
    const res = await createSupportTicket(
      user.uid,
      user.displayName || "User",
      user.email || "No email",
      message
    );
    setLoading(false);

    if (res.success) {
      toast({ title: "✅ Message Sent", description: "Our support team will reply to you within 24 hours." });
      setMessage("");
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-3 pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <LifeBuoy className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Help Center</span>
        </div>
        <h1 className="text-4xl font-headline font-bold text-white">How can we help you?</h1>
        <p className="text-muted-foreground">Our team usually replies within 24 hours.</p>
      </div>

      {/* Contact Form */}
      <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary">Describe your issue</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide as much detail as possible so we can help you faster..."
              className="w-full h-40 p-5 rounded-2xl bg-background border border-border/50 text-sm focus:border-primary outline-none resize-none"
              required
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !message.trim()}
            className="w-full md:w-auto h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-bold text-sm gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Send Message to Support
          </Button>
        </form>
      </div>

      {/* My Previous Tickets */}
      <div className="space-y-4">
        <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Your Support History
        </h2>
        
        {ticketsLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !myTickets || myTickets.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border/30 rounded-2xl text-center">
            <p className="text-muted-foreground text-sm italic">You haven't contacted support yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket: any) => (
              <div key={ticket.id} className="bg-card/50 border border-border/50 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-bold text-white">{format(new Date(ticket.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest",
                    ticket.status === 'open' ? "bg-amber-500/20 text-amber-500" :
                    ticket.status === 'replied' ? "bg-primary/20 text-primary" :
                    "bg-green-500/20 text-green-500"
                  )}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-white/80 bg-background/50 p-3 rounded-xl">{ticket.message}</p>
                
                {/* Replies */}
                {ticket.replies && ticket.replies.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-primary/30">
                    <p className="text-[10px] font-bold uppercase text-primary mb-2">Support Team Reply</p>
                    {ticket.replies.map((reply: any, idx: number) => (
                      <div key={idx} className="bg-primary/5 p-3 rounded-xl text-sm text-white/90">
                        {reply.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}