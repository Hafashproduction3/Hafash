"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MessageSquare,
  User as UserIcon,
  Send,
  Loader2,
  Sparkles,
  Search,
  Calendar,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

interface RequestData {
  id: string;
  hirerId: string;
  hirerName: string;
  professionalId: string;
  professionalName: string;
  status: string;
  eventType: string;
  eventDate: string;
  eventLocation?: string;
  createdAt: any;
}

interface ChatMeta {
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageBy?: string;
  participants?: string[];
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // Query requests where user is hirer (accepted or completed)
  const hirerQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("hirerId", "==", user.uid),
      where("status", "in", ["accepted", "completed"])
    );
  }, [firestore, user?.uid]);

  // Query requests where user is professional (accepted or completed)
  const professionalQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid),
      where("status", "in", ["accepted", "completed"])
    );
  }, [firestore, user?.uid]);

  const { data: hirerRequests, loading: hirerLoading } = useCollection(hirerQuery);
  const { data: professionalRequests, loading: professionalLoading } = useCollection(professionalQuery);

  const loading = hirerLoading || professionalLoading;

  // Merge and dedupe
  const allRequests = useMemo<RequestData[]>(() => {
    const map = new Map<string, RequestData>();
    [...(hirerRequests || []), ...(professionalRequests || [])].forEach((r: any) => {
      if (r?.id) map.set(r.id, r as RequestData);
    });
    return Array.from(map.values());
  }, [hirerRequests, professionalRequests]);

  // Fetch chat meta + other person profile
  const [chatMetas, setChatMetas] = useState<Record<string, ChatMeta>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!firestore || allRequests.length === 0) return;
    let cancelled = false;

    async function fetchMetas() {
      const newChatMetas: Record<string, ChatMeta> = {};
      const newProfiles: Record<string, any> = {};

      await Promise.all(
        allRequests.map(async (req) => {
          // Fetch chat meta
          try {
            const chatRef = doc(firestore!, "networkChats", req.id);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
              newChatMetas[req.id] = chatSnap.data() as ChatMeta;
            }
          } catch (e) {
            // Silent fail — no chat yet
          }

          // Fetch other person's profile
          const otherId = req.hirerId === user?.uid ? req.professionalId : req.hirerId;
          if (otherId && !newProfiles[otherId]) {
            try {
              const pRef = doc(firestore!, "networkProfiles", otherId);
              const pSnap = await getDoc(pRef);
              if (pSnap.exists()) {
                newProfiles[otherId] = pSnap.data();
              }
            } catch (e) {
              // Silent fail
            }
          }
        })
      );

      if (!cancelled) {
        setChatMetas(newChatMetas);
        setProfiles(newProfiles);
      }
    }

    fetchMetas();

    return () => {
      cancelled = true;
    };
  }, [firestore, allRequests, user?.uid]);

  // Sort by last message time
  const sortedRequests = useMemo(() => {
    return [...allRequests].sort((a, b) => {
      const aTime = chatMetas[a.id]?.lastMessageAt?.seconds || a.createdAt?.seconds || 0;
      const bTime = chatMetas[b.id]?.lastMessageAt?.seconds || b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [allRequests, chatMetas]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-6">

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
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
              <MessageSquare className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Conversations
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Messages
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your active conversations in one place.
            </p>
          </div>
        </div>

        {/* Stats */}
        {allRequests.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-lg font-bold">
              {allRequests.length} {allRequests.length === 1 ? "chat" : "chats"}
            </Badge>
            <span>Tap any conversation to open</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : sortedRequests.length === 0 ? (
          <EmptyState onAction={() => router.push("/network")} />
        ) : (
          <div className="space-y-3">
            {sortedRequests.map((request) => {
              const meta = chatMetas[request.id];
              const otherId = request.hirerId === user.uid ? request.professionalId : request.hirerId;
              const otherProfile = profiles[otherId];

              const otherName =
                otherProfile?.studioName ||
                otherProfile?.photographerName ||
                (request.hirerId === user.uid
                  ? request.professionalName
                  : request.hirerName) ||
                "Hafash User";

              const lastMessage = meta?.lastMessage;
              const lastMessageAt = meta?.lastMessageAt;
              const lastMessageBy = meta?.lastMessageBy;

              // Time formatting
              let timeStr = "";
              if (lastMessageAt) {
                try {
                  const d = lastMessageAt.toDate ? lastMessageAt.toDate() : new Date(lastMessageAt);
                  if (isToday(d)) {
                    timeStr = format(d, "hh:mm a");
                  } else if (isYesterday(d)) {
                    timeStr = "Yesterday";
                  } else {
                    timeStr = format(d, "dd MMM");
                  }
                } catch {
                  timeStr = "";
                }
              }

              // Is last message from me?
              const isFromMe = lastMessageBy === user.uid;

              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => router.push(`/network/chat/${request.id}`)}
                  className="w-full text-left"
                >
                  <Card className="rounded-2xl border-border/40 bg-card/70 hover:border-primary/40 hover:bg-card/90 transition-all duration-300 hover:translate-x-1 cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-primary" />
                          </div>
                          {!lastMessage && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-headline font-bold text-base truncate group-hover:text-primary transition-colors">
                              {otherName}
                            </h3>
                            {timeStr && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {timeStr}
                              </span>
                            )}
                          </div>

                          {/* Event info */}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
                            <span className="font-medium">{request.eventType}</span>
                            <span>•</span>
                            <span className="truncate">{request.eventLocation || "—"}</span>
                          </div>

                          {/* Last message */}
                          <p className={cn(
                            "text-sm truncate",
                            lastMessage ? "text-foreground/80" : "text-muted-foreground italic"
                          )}>
                            {lastMessage ? (
                              <>
                                {isFromMe && (
                                  <span className="text-muted-foreground mr-1">You:</span>
                                )}
                                {lastMessage}
                              </>
                            ) : (
                              "No messages yet — say salam 👋"
                            )}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-muted/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-muted/30 rounded" />
                <div className="h-3 w-64 bg-muted/20 rounded" />
                <div className="h-3 w-48 bg-muted/20 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
      <CardContent className="p-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-xl">No messages yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Once a work request is accepted, your conversations with other professionals will appear here.
          </p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 mt-2"
          onClick={onAction}
        >
          <Sparkles className="w-4 h-4" />
          Browse Network
        </Button>
      </CardContent>
    </Card>
  );
}