"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  NOTIFICATION_STYLES,
  formatRelativeTime,
  type NotificationType,
  type NotificationData,
} from "@/lib/notifications";
import Link from "next/link";

const ICON_MAP: Record<string, React.ReactNode> = {
  Bell: <Bell className="w-4 h-4" />,
  Check: <Check className="w-4 h-4" />,
  X: <X className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  CheckCircle2: <CheckCircle2 className="w-4 h-4" />,
  MapPin: <MapPin className="w-4 h-4" />,
  CalendarDays: <CalendarDays className="w-4 h-4" />,
};

export function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen to notifications
  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "notifications"),
      where("userId", "==", user.uid),
      limit(30)
    );
  }, [firestore, user?.uid]);

  const { data: rawNotifications, loading } = useCollection(notificationsQuery);

  // Sort by createdAt (newest first) + take latest 10 for dropdown
  const notifications = useMemo<NotificationData[]>(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications]
      .sort((a: any, b: any) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      })
      .slice(0, 10) as NotificationData[];
  }, [rawNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => !n.read).length;
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Mark single as read
  const markAsRead = async (notificationId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "notifications", notificationId), {
        read: true,
      });
    } catch (err) {
      console.error("[NOTIF] Mark read error:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!firestore || !user || notifications.length === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const batch = writeBatch(firestore);
      notifications
        .filter((n: any) => !n.read)
        .forEach((n: any) => {
          batch.update(doc(firestore, "notifications", n.id), { read: true });
        });
      await batch.commit();
      toast({ title: "All marked as read" });
    } catch (err: any) {
      console.error("[NOTIF] Mark all error:", err);
      toast({ variant: "destructive", title: "Failed to mark as read" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Click on notification → navigate
  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-11 h-11 lg:w-12 lg:h-12 rounded-2xl border transition-all duration-300 flex items-center justify-center group",
          isOpen
            ? "bg-primary/15 border-primary/40 shadow-lg shadow-primary/20"
            : "bg-background/50 border-border/40 hover:bg-primary/5 hover:border-primary/30"
        )}
        aria-label="Notifications"
      >
        <Bell
          className={cn(
            "w-5 h-5 transition-all",
            isOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary",
            unreadCount > 0 && "animate-[wiggle_1s_ease-in-out]"
          )}
        />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-background animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-3 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden",
            "animate-in fade-in slide-in-from-top-2 duration-200"
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 bg-background/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-headline font-bold text-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge className="rounded-md bg-red-500/15 text-red-400 border-red-500/30 text-[9px] font-bold uppercase tracking-widest gap-1">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={isMarkingAll}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Mark All
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Inbox className="w-7 h-7 text-primary/50" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Koi notification nahi</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Jab koi cross bheje, message kare, ya review de — yahan aayega
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {notifications.map((notif: any) => {
                  const style = NOTIFICATION_STYLES[notif.type as NotificationType] || NOTIFICATION_STYLES.new_request;
                  const icon = ICON_MAP[style.icon] || <Bell className="w-4 h-4" />;

                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "w-full text-left p-3.5 transition-all flex items-start gap-3 group",
                        notif.read
                          ? "hover:bg-primary/5"
                          : "bg-primary/[0.03] hover:bg-primary/10"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        style.bgColor,
                        style.color
                      )}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={cn(
                            "text-[13px] leading-tight truncate",
                            notif.read ? "font-medium text-muted-foreground" : "font-bold text-white"
                          )}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5 animate-pulse" />
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>

                        <p className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-bold mt-1.5">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/30 p-2 bg-background/40">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block"
              >
                <Button
                  variant="ghost"
                  className="w-full rounded-xl gap-2 text-xs font-bold text-primary hover:bg-primary/10"
                >
                  View All Notifications
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Wiggle animation */}
      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          75% { transform: rotate(12deg); }
        }
      `}</style>
    </div>
  );
}