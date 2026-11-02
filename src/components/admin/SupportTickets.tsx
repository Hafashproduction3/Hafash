"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { LifeBuoy, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { replyToTicket } from "@/app/actions/admin-support";
import { useToast } from "@/hooks/use-toast";

export function SupportTickets() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const ticketsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "support_tickets"), orderBy("createdAt", "desc"), limit(50));
  }, [firestore]);

  const { data: tickets, loading } = useCollection(ticketsQuery);

  const handleReply = async (closeTicket: boolean) => {
    if (!adminUser || !selectedTicket || !replyText.trim()) return;
    setReplying(true);
    const res = await replyToTicket(selectedTicket.id, adminUser.uid, replyText, closeTicket);
    setReplying(false);
    if (res.success) {
      toast({ title: "Reply Sent", description: closeTicket ? "Ticket closed successfully." : "Reply sent to user." });
      setReplyText("");
      setSelectedTicket(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LifeBuoy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-lg text-white">Support Center</h3>
          <p className="text-xs text-muted-foreground">Reply to your users' inquiries.</p>
        </div>
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-border/50 rounded-xl text-center">
          <p className="text-muted-foreground text-sm italic">No support tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <div 
              key={ticket.id} 
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                ticket.status === 'open' ? 'bg-primary/5 border-primary/30' : 'bg-background border-border/50'
              }`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-white text-sm">{ticket.userName || ticket.userEmail}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  ticket.status === 'open' ? 'bg-destructive/20 text-destructive' : 
                  ticket.status === 'replied' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm text-white/80 line-clamp-2">{ticket.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border/50 p-6 shadow-2xl">
            <h3 className="font-headline font-bold text-lg mb-1">Ticket from {selectedTicket.userName}</h3>
            <p className="text-xs text-muted-foreground mb-4">{selectedTicket.userEmail}</p>
            
            <div className="bg-background p-3 rounded-xl mb-4 text-sm text-white/90">
              {selectedTicket.message}
            </div>

            {selectedTicket.replies?.map((r: any, i: number) => (
              <div key={i} className={`p-3 rounded-xl mb-2 text-sm ${r.sender === 'admin' ? 'bg-primary/10 text-primary ml-8' : 'bg-muted text-white mr-8'}`}>
                <span className="text-[10px] font-bold uppercase block opacity-50">{r.sender}</span>
                {r.message}
              </div>
            ))}

            <textarea 
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full h-24 p-3 rounded-xl bg-background border border-border/50 mt-4 focus:border-primary outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
              <Button onClick={() => handleReply(false)} disabled={replying}>Reply</Button>
              <Button onClick={() => handleReply(true)} disabled={replying} className="bg-green-500 hover:bg-green-600">Reply & Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}