"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Loader2,
  Calendar,
  MapPin,
  Briefcase,
  MessageSquare,
  Check,
  CheckCheck,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
  read?: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const requestId = Array.isArray(params?.requestId)
    ? params.requestId[0]
    : params?.requestId;

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the request
  const requestRef = useMemo(() => {
    if (!firestore || !requestId) return null;
    return doc(firestore, "networkRequests", requestId);
  }, [firestore, requestId]);

  const { data: request, loading: requestLoading } = useDoc(requestRef);

  // Get the other person's profile
  const otherUserId = useMemo(() => {
    if (!request || !user) return null;
    return request.hirerId === user.uid ? request.professionalId : request.hirerId;
  }, [request, user]);

  const otherUserProfileRef = useMemo(() => {
    if (!firestore || !otherUserId) return null;
    return doc(firestore, "networkProfiles", otherUserId);
  }, [firestore, otherUserId]);

  const { data: otherUserProfile } = useDoc(otherUserProfileRef);

  const otherUserName = useMemo(() => {
    if (!otherUserProfile) return "Hafash User";
    return otherUserProfile.studioName || otherUserProfile.photographerName || "Hafash User";
  }, [otherUserProfile]);

  const chatId = useMemo(() => {
    if (!requestId) return null;
    return requestId;
  }, [requestId]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!firestore || !chatId) return;

    setLoadingMessages(true);
    const messagesRef = collection(firestore, "networkChats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(500));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() } as Message);
        });
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("[CHAT] Listen error:", error);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, chatId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark chat as read when opened
  useEffect(() => {
    if (!firestore || !chatId || !user || !request) return;

    const markAsRead = async () => {
      try {
        const chatRef = doc(firestore, "networkChats", chatId);
        const isHirer = request.hirerId === user.uid;
        await setDoc(
          chatRef,
          {
            [isHirer ? "readByHirerAt" : "readByProfessionalAt"]: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("[CHAT] Mark read error:", err);
      }
    };

    markAsRead();
  }, [firestore, chatId, user, request]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!user || !firestore || !chatId || !messageText.trim() || isSending || !request) return;

    setIsSending(true);
    const text = messageText.trim();
    setMessageText("");

    try {
      await addDoc(collection(firestore, "networkChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Hafash User",
        text,
        createdAt: serverTimestamp(),
        read: false,
      });

      const chatRef = doc(firestore, "networkChats", chatId);
      await setDoc(
        chatRef,
        {
          requestId,
          participants: [request.hirerId, request.professionalId],
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
        },
        { merge: true }
      );

      inputRef.current?.focus();
    } catch (error: any) {
      console.error("[CHAT] Send error:", error);
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: error.message,
      });
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  }, [user, firestore, chatId, messageText, isSending, request, requestId, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; label: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    messages.forEach((msg) => {
      let msgDate: Date;
      try {
        msgDate = msg.createdAt?.toDate?.() || new Date(msg.createdAt);
      } catch {
        msgDate = new Date();
      }

      const dateKey = format(msgDate, "yyyy-MM-dd");

      if (dateKey !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            label: getDateLabel(currentDate),
            messages: currentGroup,
          });
        }
        currentDate = dateKey;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        label: getDateLabel(currentDate),
        messages: currentGroup,
      });
    }

    return groups;
  }, [messages]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  if (requestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request || request.status !== "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div>
              <h2 className="font-headline font-bold text-xl">Chat unavailable</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Chat opens after a request is accepted.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMyRequest = request.hirerId === user.uid;

  let eventDateFormatted = request.eventDate;
  try {
    eventDateFormatted = format(new Date(request.eventDate), "EEE, dd MMM yyyy");
  } catch {}

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-bold text-base truncate">
              {otherUserName}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="truncate">
                {isMyRequest ? "Professional" : "Hirer"} • {request.eventType}
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className="rounded-xl border-green-500/30 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-widest hidden sm:flex"
          >
            <Check className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        </div>

        {/* Event Info Bar */}
        <div className="border-t border-border/20 bg-background/50">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex flex-wrap gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="w-3 h-3 text-primary" />
              <span className="font-medium">{request.eventType}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="font-medium">{eventDateFormatted}</span>
            </div>
            {request.eventLocation && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="font-medium truncate">{request.eventLocation}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 pb-4">

          {loadingMessages ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg">Start the conversation</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  Share details about the event — exact location, timing, requirements.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.date} className="space-y-3">
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold shrink-0">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>

                  {group.messages.map((msg, idx) => {
                    const isMine = msg.senderId === user.uid;
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                    const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

                    let timeStr = "";
                    try {
                      const d = msg.createdAt?.toDate?.() || new Date(msg.createdAt);
                      timeStr = format(d, "hh:mm a");
                    } catch {}

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2 items-end",
                          isMine ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isMine && (
                          <div className={cn(
                            "w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0",
                            !showAvatar && "opacity-0"
                          )}>
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border border-border/40 rounded-bl-md"
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-[9px]",
                            isMine ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"
                          )}>
                            <span>{timeStr}</span>
                            {isMine && (
                              msg.read
                                ? <CheckCheck className="w-3 h-3" />
                                : <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border/40">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex gap-2 items-end">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              className="flex-1 h-12 rounded-2xl bg-background border-border/40 text-sm"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              maxLength={1000}
            />
            <Button
              size="icon"
              className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              onClick={handleSend}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Messages are private between you and {otherUserName}
          </p>
        </div>
      </div>
    </div>
  );
}

function getDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, dd MMM yyyy");
  } catch {
    return dateStr;
  }
}