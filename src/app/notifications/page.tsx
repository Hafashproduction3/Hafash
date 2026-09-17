"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  X,
  CheckCircle2,
  Star,
  MessageSquare,
  MapPin,
  CalendarDays,
  XCircle,
  Inbox,
  Loader2,
  Sparkles,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  NOTIFICATION_STYLES,
  formatRelativeTime,
  type NotificationType,
} from "@/lib/notifications";

const ICON_MAP: Record<string, React.ReactNode> = {
  Bell: <Bell className="w-5 h-5" />,
  Check: <Check className="w-5 h-5" />,
  X: <X className="w-5 h-5" />,
  XCircle: <XCircle className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  CheckCircle2: <CheckCircle2 className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  CalendarDays: <CalendarDays className="w-5 h-5" />,
};

type FilterTab = 'all' | 'unread';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "notifications"),
      where("userId", "==", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: rawNotifications, loading } = useCollection(notificationsQuery);

  // Sort by newest
  const allNotifications = useMemo(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications].sort((a: any, b: any) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
  }, [rawNotifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return allNotifications.filter((n: any) => !n.read);
    return allNotifications;
  }, [allNotifications, filter]);

  const unreadCount = useMemo(
    () => allNotifications.filter((n: any) => !n.read).length,
    [allNotifications]
  );

  const handleMarkAllRead = async () => {
    if (!firestore || !user || unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const batch = writeBatch(firestore);
      allNotifications
        .filter((n: any) => !n.read)
        .forEach((n: any) => {
          batch.update(doc(firestore, "notifications", n.id), { read: true });
        });
      await batch.commit();
      toast({ title: "All marked as read" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClick = async (notif: any) => {
    if (!firestore) return;
    if (!notif.read) {
      try {
        await updateDoc(doc(firestore, "notifications", notif.id), { read: true });
      } catch (err) {
        console.error("[NOTIF] Mark read error:", err);
      }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    if (!firestore || processingId) return;
    setProcessingId(notifId);
    try {
      await deleteDoc(doc(firestore, "notifications", notifId));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete" });
    } finally {
      setProcessingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mb-2">
              <Bell className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Notification Center
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Notifications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Saari activity ek jagah — cross requests, messages, reviews, aur bookings.
            </p>
          </div>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                filter === 'all'
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:border-primary/30"
              )}
            >
              All ({allNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5",
                filter === 'unread'
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:border-primary/30"
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 border-primary/30 hover:bg-primary/5"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Mark All Read
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="rounded-2xl border-border/40 bg-card/60">
                <CardContent className="p-5">
                  <div className="animate-pulse space-y-3 flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-muted/30 rounded" />
                      <div className="h-3 w-full bg-muted/20 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
            <CardContent className="p-16 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Inbox className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl">
                  {filter === 'unread' ? "Koi unread notification nahi" : "Koi notification nahi"}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Jab koi aapko cross request bhejega, message karega, ya review dega — uski notification yahan aayegi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif: any) => {
              const style = NOTIFICATION_STYLES[notif.type as NotificationType] || NOTIFICATION_STYLES.new_request;
              const icon = ICON_MAP[style.icon] || <Bell className="w-5 h-5" />;

              return (
                <Card
                  key={notif.id}
                  className={cn(
                    "relative rounded-2xl border bg-card/80 overflow-hidden transition-all duration-300 group",
                    notif.read
                      ? "border-border/40 hover:border-primary/30"
                      : "border-primary/30 bg-primary/[0.03] hover:border-primary/50 shadow-md shadow-primary/5"
                  )}
                >
                  {/* Unread bar */}
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}

                  <CardContent className="p-5">
                    <div
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => handleClick(notif)}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        style.bgColor,
                        style.color
                      )}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className={cn(
                            "text-[15px] leading-tight",
                            notif.read
                              ? "font-medium text-muted-foreground"
                              : "font-bold text-white"
                          )}>
                            {notif.title}
                          </h3>
                          {!notif.read && (
                            <Badge className="rounded-md bg-primary/15 text-primary border-primary/30 text-[9px] font-bold uppercase tracking-widest shrink-0">
                              New
                            </Badge>
                          )}
                        </div>

                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {notif.body}
                        </p>

                        <div className="flex items-center justify-between gap-3 mt-2">
                          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-bold">
                            {formatRelativeTime(notif.createdAt)}
                          </p>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, notif.id)}
                            disabled={processingId === notif.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 disabled:opacity-50"
                            title="Delete notification"
                          >
                            {processingId === notif.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}