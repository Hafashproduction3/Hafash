"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import {
  collection,
  query,
  where,
} from "firebase/firestore";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  DollarSign,
  ArrowRight,
  Sparkles,
  Building2,
  MessageSquare,
  AlertCircle,
  FileText,
  Wallet,
  Send,
  Plus,
  ArrowLeft,
  Star,
  Briefcase,
  TrendingUp,
  Filter,
  Camera,
  Video,
  Plane,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type HireStatus = "all" | "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";

const STATUS_TABS: { key: HireStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  "in-progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function MyHiresPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<HireStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ═══ Fetch hires where I'm the hirer ═══
  const hiresQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "networkHires"),
      where("hirerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: hires, loading } = useCollection(hiresQuery);

  // ═══ Filter + sort ═══
  const filteredHires = useMemo(() => {
    if (!hires) return [];

    let list = [...hires];

    if (activeTab !== "all") {
      list = list.filter((h: any) => h.status === activeTab);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (h: any) =>
          h.professionalName?.toLowerCase().includes(term) ||
          h.eventType?.toLowerCase().includes(term) ||
          h.eventLocation?.toLowerCase().includes(term)
      );
    }

    return list.sort((a: any, b: any) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
  }, [hires, activeTab, searchTerm]);

  // ═══ Stats ═══
  const stats = useMemo(() => {
    const list = hires || [];
    return {
      total: list.length,
      pending: list.filter((h: any) => h.status === "pending").length,
      confirmed: list.filter((h: any) => h.status === "confirmed").length,
      inProgress: list.filter((h: any) => h.status === "in-progress").length,
      completed: list.filter((h: any) => h.status === "completed").length,
      cancelled: list.filter((h: any) => h.status === "cancelled").length,
      totalSpent: list
        .filter((h: any) => h.status === "completed")
        .reduce((sum: number, h: any) => sum + (h.amount || 0), 0),
      activeAmount: list
        .filter((h: any) => h.status === "confirmed" || h.status === "in-progress")
        .reduce((sum: number, h: any) => sum + (h.amount || 0), 0),
    };
  }, [hires]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <User className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold">Login required</h2>
            <p className="text-sm text-muted-foreground">
              Apni hires dekhne ke liye login karein.
            </p>
            <Link href="/login">
              <Button className="rounded-xl">Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-5 lg:p-10 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-border/30 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                My Hires
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Hire <span className="text-primary italic">History</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Jinko aap ne hire kiya hai — unki details, dates, aur payments yahan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/network">
              <Button variant="outline" className="rounded-2xl gap-2 border-border/40">
                <ArrowLeft className="w-4 h-4" />
                Find Cross
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat
            label="Total Hires"
            value={stats.total.toString()}
            icon={<Briefcase className="w-4 h-4" />}
            color="primary"
          />
          <MiniStat
            label="Active"
            value={(stats.confirmed + stats.inProgress).toString()}
            icon={<Clock className="w-4 h-4" />}
            color="amber"
          />
          <MiniStat
            label="Completed"
            value={stats.completed.toString()}
            icon={<CheckCircle2 className="w-4 h-4" />}
            color="green"
          />
          <MiniStat
            label="Total Spent"
            value={`Rs. ${stats.totalSpent.toLocaleString()}`}
            icon={<DollarSign className="w-4 h-4" />}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? stats.total
                  : tab.key === "pending"
                    ? stats.pending
                    : tab.key === "confirmed"
                      ? stats.confirmed
                      : tab.key === "in-progress"
                        ? stats.inProgress
                        : tab.key === "completed"
                          ? stats.completed
                          : stats.cancelled;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 h-9 rounded-xl text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card/40 text-muted-foreground hover:bg-card/60 border border-border/30"
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                        activeTab === tab.key
                          ? "bg-primary-foreground/20"
                          : "bg-muted"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by professional, event, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card/40 border-border/40"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-card/20" />
            ))}
          </div>
        ) : filteredHires.length === 0 ? (
          <Card className="bg-card/40 border-border/40 rounded-[2rem] border-dashed">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Briefcase className="w-10 h-10 text-primary/50" />
              </div>
              <h2 className="text-2xl font-headline font-bold mb-2">
                {searchTerm || activeTab !== "all"
                  ? "Koi hire nahi mili"
                  : "Abhi koi hire nahi"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                {searchTerm || activeTab !== "all"
                  ? "Filters change karein ya search term clear karein."
                  : "Jab aap kisi professional ko hire karenge, woh yahan dikhega."}
              </p>
              {!searchTerm && activeTab === "all" && (
                <Link href="/network">
                  <Button className="rounded-xl gap-2 bg-primary text-primary-foreground font-bold h-12 px-6">
                    <Search className="w-4 h-4" />
                    Find Cross
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHires.map((hire: any) => (
              <HireCard key={hire.id} hire={hire} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MINI STAT
// ═══════════════════════════════════════════════════════════════

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "amber" | "green" | "blue";
}) {
  const colors = {
    primary: {
      border: "border-primary/20",
      bg: "bg-primary/5",
      icon: "text-primary",
      iconBg: "bg-primary/15",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      icon: "text-amber-400",
      iconBg: "bg-amber-500/15",
    },
    green: {
      border: "border-green-500/20",
      bg: "bg-green-500/5",
      icon: "text-green-400",
      iconBg: "bg-green-500/15",
    },
    blue: {
      border: "border-blue-500/20",
      bg: "bg-blue-500/5",
      icon: "text-blue-400",
      iconBg: "bg-blue-500/15",
    },
  }[color];

  return (
    <Card className={cn("rounded-2xl border", colors.border, colors.bg)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            colors.iconBg
          )}
        >
          <div className={colors.icon}>{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-headline font-bold mt-0.5 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// HIRE CARD
// ═══════════════════════════════════════════════════════════════

function HireCard({ hire }: { hire: any }) {
  const status: string = hire.status || "pending";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

  const hasInvoice = !!hire.invoice;
  const advanceReceived = hire.advanceReceived === true;
  const professionalPhone = hire.professionalPhone || "";

  return (
    <Card className="bg-card/60 border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 transition-all">
      <CardContent className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Left — Professional info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-headline font-bold text-base truncate">
                    {hire.professionalName || "Professional"}
                  </h3>
                </div>
                {hire.eventLocation && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{hire.eventLocation}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {advanceReceived && (
                  <Badge className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                    <Wallet className="w-2.5 h-2.5" />
                    Advance Paid
                  </Badge>
                )}
                <Badge
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    statusColor
                  )}
                >
                  {status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              {hire.eventDate && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {hire.eventDate}
                </span>
              )}
              {hire.eventType && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  {hire.eventType}
                </span>
              )}
              {professionalPhone && (
                <a
                  href={`tel:${professionalPhone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {professionalPhone}
                </a>
              )}
            </div>

            {hire.message && (
              <div className="p-3 rounded-xl bg-background/40 border border-border/30">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    {hire.message}
                  </p>
                </div>
              </div>
            )}

            {hasInvoice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Invoice: {hire.invoice.invoiceNumber}
                </p>
              </div>
            )}
          </div>

          {/* Right — Amount + Actions */}
          <div className="lg:w-48 flex flex-col justify-between gap-3 lg:border-l lg:border-border/30 lg:pl-5">
            {hire.amount > 0 && (
              <div className="text-center lg:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Amount
                </p>
                <p className="text-2xl font-headline font-bold text-primary">
                  Rs. {hire.amount.toLocaleString()}
                </p>
                {hasInvoice && hire.invoice.advanceAmount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Advance: Rs. {hire.invoice.advanceAmount.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="flex lg:flex-col gap-2 flex-wrap">
              {hire.professionalId && (
                <Link
                  href={`/network/professional/${hire.professionalId}`}
                  className="flex-1 rounded-xl gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-bold text-[10px] uppercase tracking-widest h-9 flex items-center justify-center"
                >
                  <User className="w-3.5 h-3.5" />
                  View Profile
                </Link>
              )}

              {professionalPhone && (
                <a
                  href={`https://wa.me/${professionalPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Salam ${hire.professionalName}, ${hire.eventType} ke liye baat karni hai.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl gap-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 font-bold text-[10px] uppercase tracking-widest h-9 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}