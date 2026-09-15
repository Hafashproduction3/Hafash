"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  Send,
  Clock,
  Check,
  X,
  Calendar,
  MapPin,
  Briefcase,
  User as UserIcon,
  Loader2,
  Inbox,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  createdAt: any;
  updatedAt: any;
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: <Clock className="w-3.5 h-3.5" />,
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
    icon: <Check className="w-3.5 h-3.5" />,
  },
};

export default function MyRequestsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const requestsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkRequests"),
      where("hirerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: requests, loading } = useCollection(requestsQuery);

  // Sort newest first
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

  const handleCancel = useCallback(async () => {
    if (!firestore || !cancelTarget || isCancelling) return;
    setIsCancelling(true);
    try {
      await updateDoc(doc(firestore, "networkRequests", cancelTarget), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Request Cancelled" });
      setCancelTarget(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to cancel" });
    } finally {
      setIsCancelling(false);
    }
  }, [firestore, cancelTarget, isCancelling, toast]);

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
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
              <Send className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Sent Requests
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              My Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track all work requests you&apos;ve sent to professionals.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All (${counts.all})`}
          />
          <FilterChip
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            label={`Pending (${counts.pending})`}
          />
          <FilterChip
            active={filter === "accepted"}
            onClick={() => setFilter("accepted")}
            label={`Accepted (${counts.accepted})`}
          />
          <FilterChip
            active={filter === "declined"}
            onClick={() => setFilter("declined")}
            label={`Declined (${counts.declined})`}
          />
          <FilterChip
            active={filter === "cancelled"}
            onClick={() => setFilter("cancelled")}
            label={`Cancelled (${counts.cancelled})`}
          />
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title={filter === "all" ? "No requests sent yet" : `No ${filter} requests`}
            description={
              filter === "all"
                ? "Browse the Network and send your first work request."
                : "Try a different filter to see other requests."
            }
            onAction={() => router.push("/network")}
            actionLabel="Browse Network"
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request: any) => (
              <RequestCard
                key={request.id}
                request={request as NetworkRequest}
                viewMode="hirer"
                onCancel={() => setCancelTarget(request.id)}
                onViewProfile={() =>
                  router.push(`/network/professional/${request.professionalId}`)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              The professional will be notified that you&apos;ve withdrawn your request.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
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
              <div className="h-3 w-48 bg-muted/20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
      <CardContent className="p-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Inbox className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-xl">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {description}
          </p>
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

function RequestCard({
  request,
  viewMode,
  onCancel,
  onAccept,
  onDecline,
  onViewProfile,
}: {
  request: NetworkRequest;
  viewMode: "hirer" | "professional";
  onCancel?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onViewProfile: () => void;
}) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const personName =
    viewMode === "hirer" ? request.professionalName : request.hirerName;
  const personLabel = viewMode === "hirer" ? "Professional" : "Requested by";

  let formattedDate = request.eventDate;
  try {
    formattedDate = format(new Date(request.eventDate), "EEE, dd MMM yyyy");
  } catch {}

  return (
    <Card className="rounded-3xl border-border/40 bg-card/70 overflow-hidden hover:border-primary/30 transition-all">
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      <CardContent className="p-6 space-y-5">

        {/* Top Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              {personLabel}
            </p>
            <button
              type="button"
              className="font-headline font-bold text-lg hover:text-primary transition-colors text-left"
              onClick={onViewProfile}
            >
              {personName || "Unknown"}
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

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Event Type"
            value={request.eventType || "—"}
          />
          <DetailRow
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Event Date"
            value={formattedDate || "—"}
          />
          {request.eventLocation && (
            <DetailRow
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Location"
              value={request.eventLocation}
            />
          )}
          {request.budget != null && request.budget > 0 && (
            <DetailRow
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label="Budget"
              value={`Rs. ${request.budget.toLocaleString()}`}
            />
          )}
        </div>

        {/* Message */}
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

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
          {viewMode === "hirer" && request.status === "pending" && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={onCancel}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancel Request
            </Button>
          )}

          {viewMode === "professional" && request.status === "pending" && (
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
            View Profile
            <UserIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/40 border border-border/30">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}