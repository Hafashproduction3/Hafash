"use client";
import { useState } from "react";
import { useUser } from "@/firebase";
import { Send, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendBroadcastNotification } from "@/app/actions/admin-broadcast";

export default function AdminNotificationsPage() {
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSend = async () => {
    if (!adminUser || !title || !body) return;
    setLoading(true);
    const res = await sendBroadcastNotification(adminUser.uid, title, body);
    setLoading(false);
    if (res.success) {
      toast({ title: "Success", description: `Notification sent to ${res.count} users!` });
      setTitle(""); setBody("");
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1 flex items-center gap-2"><Bell className="w-8 h-8 text-primary" /> Broadcast Notifications</h1>
        <p className="text-muted-foreground text-sm">Send an alert to every user's notification bell.</p>
      </div>

      <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4 shadow-lg">
        <div>
          <label className="text-xs font-bold uppercase text-primary block mb-2">Notification Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., New Feature Launched!" className="w-full h-12 px-4 rounded-xl bg-background border border-border/50 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-primary block mb-2">Message Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here..." className="w-full h-32 p-4 rounded-xl bg-background border border-border/50 focus:border-primary outline-none resize-none" />
        </div>
        <Button onClick={handleSend} disabled={loading || !title || !body} className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl mt-4">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />} Send to All Users
        </Button>
      </div>
    </div>
  );
}