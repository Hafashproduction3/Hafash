"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Inbox,
  Clock,
  Check,
  X,
  Calendar,
  MapPin,
  Briefcase,
  User as UserIcon,
  Loader2,
  MessageSquare,
  Sparkles,
  Bell,
  CheckCircle2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { notifyRequestAccepted, notifyRequestDeclined } from "@/lib/create-notification";

type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

interface NetworkRequest {
  id: string;
  hirerId: string;
  hirerName: string;
  professionalId: string;
  professionalName: string;
  status: RequestStatus;
  eventDate: string;
  eventType: string;
  eventLocation?: string;
  budget?: number | null;
  message?: string;
  completedByHirer?: boolean;
  completedByProfessional?: boolean;
  hirerReviewed?: boolean;
  professionalReviewed?: boolean;
  createdAt: any;
  updatedAt: any;
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "New",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: <Bell className="w-3.5 h-3.5" />,
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-500/15 text-green-400 border-green-500/30",
    icon: <Check className="w-3.5 h-3.5" />,
  },
  declined: {
    label: "Declined",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <X className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted text-muted-foreground border-border/40",
    icon: <X className="w-3.5 h-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-primary/15 text-primary border-primary/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

export default function IncomingRequestsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const [actionTarget, setActionTarget] = useState<{ id: string; action: "accept" | "decline" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const requestsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("professionalId", "==", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: requests, loading } = useCollection(requestsQuery);

  const sortedRequests = useMemo(() => {
    if (!requests) return [];
    return [...requests].sort((a: any, b: any) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return sortedRequests;
    return sortedRequests.filter((r: any) => r.status === filter);
  }, [sortedRequests, filter]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, accepted: 0, declined: 0, cancelled: 0, completed: 0 };
    sortedRequests.forEach((r: any) => {
      c.all++;
      if (r.status in c) c[r.status as keyof typeof c]++;
    });
    return c;
  }, [sortedRequests]);

  const handleAction = useCallback(async () => {
    if (!firestore || !actionTarget || isProcessing || !user) return;
    setIsProcessing(true);
    try {
      const targetRequest = sortedRequests.find((r: any) => r.id === actionTarget.id);
      if (!targetRequest) throw new Error("Request not found");

      const newStatus = actionTarget.action === "accept" ? "accepted" : "declined";

      // 1. Update request status
      await updateDoc(doc(firestore, "networkRequests", actionTarget.id), {
        status: newStatus,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Notify the hirer
      const professionalName = targetRequest.professionalName || user.displayName || "Professional";
      if (actionTarget.action === "accept") {
        await notifyRequestAccepted(firestore, {
          hirerId: targetRequest.hirerId,
          professionalId: user.uid,
          professionalName,
          eventType: targetRequest.eventType || "Event",
          requestId: actionTarget.id,
        });
      } else {
        await notifyRequestDeclined(firestore, {
          hirerId: targetRequest.hirerId,
          professionalId: user.uid,
          professionalName,
          eventType: targetRequest.eventType || "Event",
        });
      }

      toast({
        title: actionTarget.action === "accept" ? "Request Accepted" : "Request Declined",
        description:
          actionTarget.action === "accept"
            ? "The hirer will be notified."
            : "The hirer has been informed.",
      });
      setActionTarget(null);
    } catch (err: any) {
      console.error("[INCOMING_ACTION] Error:", err);
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setIsProcessing(false);
    }
  }, [firestore, actionTarget, isProcessing, toast, user, sortedRequests]);

  const handleMarkComplete = useCallback(async () => {
    if (!firestore || !completeTarget || isCompleting) return;
    setIsCompleting(true);
    try {
      const ref = doc(firestore, "networkRequests", completeTarget);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Request not found");

      const data = snap.data();
      const bothComplete = !!data.completedByHirer;

      await updateDoc(ref, {
        completedByProfessional: true,
        completedAt: serverTimestamp(),
        status: bothComplete ? "completed" : "accepted",
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Marked as Complete",
        description: bothComplete
          ? "Both parties confirmed — event is complete!"
          : "Waiting for the hirer to confirm.",
      });
      setCompleteTarget(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setIsCompleting(false);
    }
  }, [firestore, completeTarget, isCompleting, toast]);

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

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
              <Inbox className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Incoming
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Incoming Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Work requests sent to you by other professionals.
            </p>
          </div>
        </div>

        {counts.pending > 0 && (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {counts.pending} new request{counts.pending > 1 ? "s" : ""} waiting for your response
                </p>
                <p className="text-xs text-muted-foreground">
                  Respond quickly to improve your response time score.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${counts.all})`} />
          <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} label={`New (${counts.pending})`} />
          <FilterChip active={filter === "accepted"} onClick={() => setFilter("accepted")} label={`Accepted (${counts.accepted})`} />
          <FilterChip active={filter === "completed"} onClick={() => setFilter("completed")} label={`Completed (${counts.completed})`} />
          <FilterChip active={filter === "declined"} onClick={() => setFilter("declined")} label={`Declined (${counts.declined})`} />
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title={filter === "all" ? "No incoming requests yet" : `No ${filter} requests`}
            description={
              filter === "all"
                ? "Once other professionals find you in the Network and send requests, they'll appear here."
                : "Try a different filter."
            }
            onAction={() => router.push("/network/join")}
            actionLabel="Edit Profile"
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request: any) => (
              <IncomingRequestCard
                key={request.id}
                request={request as NetworkRequest}
                onAccept={() => setActionTarget({ id: request.id, action: "accept" })}
                onDecline={() => setActionTarget({ id: request.id, action: "decline" })}
                onMarkComplete={() => setCompleteTarget(request.id)}
                onOpenChat={() => router.push(`/network/chat/${request.id}`)}
                onLeaveReview={() => router.push(`/network/review/${request.id}`)}
                onViewProfile={() => router.push(`/network/professional/${request.hirerId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Accept/Decline Dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "accept" ? "Accept this request?" : "Decline this request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "accept"
                ? "The hirer will be notified, and your contact details will be shared with them."
                : "The hirer will be notified that you've declined. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                actionTarget?.action === "accept"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
              onClick={handleAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
              ) : actionTarget?.action === "accept" ? "Yes, Accept" : "Yes, Decline"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Complete Dialog */}
      <AlertDialog open={!!completeTarget} onOpenChange={(o) => !o && setCompleteTarget(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this event as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you delivered the event successfully. Once both parties confirm,
              you&apos;ll be able to leave a review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleMarkComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Marking...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />Yes, Complete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/30 text-muted-foreground hover:border-primary/30"
      )}
    >
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-3xl border-border/40 bg-card/60">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-40 bg-muted/30 rounded" />
              <div className="h-3 w-64 bg-muted/20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ title, description, onAction, actionLabel }: {
  title: string; description: string; onAction: () => void; actionLabel: string;
}) {
  return (
    <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
      <CardContent className="p-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Inbox className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-xl">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 mt-2"
          onClick={onAction}
        >
          <Sparkles className="w-4 h-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function IncomingRequestCard({
  request,
  onAccept,
  onDecline,
  onMarkComplete,
  onOpenChat,
  onLeaveReview,
  onViewProfile,
}: {
  request: NetworkRequest;
  onAccept: () => void;
  onDecline: () => void;
  onMarkComplete: () => void;
  onOpenChat: () => void;
  onLeaveReview: () => void;
  onViewProfile: () => void;
}) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;

  let formattedDate = request.eventDate;
  try {
    formattedDate = format(new Date(request.eventDate), "EEE, dd MMM yyyy");
  } catch {}

  const isAccepted = request.status === "accepted";
  const isCompleted = request.status === "completed";
  const iMarkedComplete = !!request.completedByProfessional;
  const iReviewed = !!request.professionalReviewed;

  return (
    <Card className="rounded-3xl border-border/40 bg-card/70 overflow-hidden hover:border-primary/30 transition-all">
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      <CardContent className="p-6 space-y-5">

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Requested by
            </p>
            <button
              type="button"
              className="font-headline font-bold text-lg hover:text-primary transition-colors text-left"
              onClick={onViewProfile}
            >
              {request.hirerName || "Hafash User"}
            </button>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold gap-1.5",
              statusConfig.color
            )}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Event Type" value={request.eventType || "—"} />
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Event Date" value={formattedDate || "—"} />
          {request.eventLocation && (
            <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={request.eventLocation} />
          )}
          {request.budget != null && request.budget > 0 && (
            <DetailRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Budget" value={`Rs. ${request.budget.toLocaleString()}`} />
          )}
        </div>

        {request.message && (
          <div className="p-4 rounded-2xl bg-background/40 border border-border/30">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {request.message}
              </p>
            </div>
          </div>
        )}

        {isAccepted && iMarkedComplete && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-xs text-green-400 font-medium">
              You marked this complete — waiting for the hirer to confirm.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
          {(isAccepted || isCompleted) && (
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-bold" onClick={onOpenChat}>
              <MessageSquare className="w-3.5 h-3.5" />
              Open Chat
            </Button>
          )}

          {isAccepted && !iMarkedComplete && (
            <Button
              size="sm"
              className="rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold gap-1.5"
              onClick={onMarkComplete}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark as Complete
            </Button>
          )}

          {isCompleted && !iReviewed && (
            <Button
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1.5"
              onClick={onLeaveReview}
            >
              <Star className="w-3.5 h-3.5" />
              Leave Review
            </Button>
          )}

          {isCompleted && iReviewed && (
            <Badge className="rounded-xl bg-primary/10 text-primary border border-primary/20 gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Review Submitted
            </Badge>
          )}

          {request.status === "pending" && (
            <>
              <Button
                size="sm"
                className="rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold gap-1.5"
                onClick={onAccept}
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                onClick={onDecline}
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl ml-auto gap-1.5 text-muted-foreground"
            onClick={onViewProfile}
          >
            View Hirer
            <UserIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/40 border border-border/30">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}