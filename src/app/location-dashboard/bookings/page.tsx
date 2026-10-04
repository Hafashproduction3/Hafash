"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  increment,
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
  Filter,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calculateLocationInvoice } from "@/lib/invoice";

type BookingStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_TABS: { key: BookingStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function LocationDashboardBookingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<BookingStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const bookingsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "locationBookings"),
      where("ownerId", "==", user.uid)
    );
  }, [firestore, user?.uid]);

  const { data: bookings, loading } = useCollection(bookingsQuery);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    let list = [...bookings];

    if (activeTab !== "all") {
      list = list.filter((b: any) => b.status === activeTab);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (b: any) =>
          b.clientName?.toLowerCase().includes(term) ||
          b.locationName?.toLowerCase().includes(term) ||
          b.clientPhone?.includes(term)
      );
    }

    return list.sort((a: any, b: any) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
  }, [bookings, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const list = bookings || [];
    return {
      total: list.length,
      pending: list.filter((b: any) => b.status === "pending").length,
      confirmed: list.filter((b: any) => b.status === "confirmed").length,
      completed: list.filter((b: any) => b.status === "completed").length,
      cancelled: list.filter((b: any) => b.status === "cancelled").length,
      revenue: list
        .filter((b: any) => b.status === "confirmed" || b.status === "completed")
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
      pendingAmount: list
        .filter((b: any) => b.status === "pending")
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
    };
  }, [bookings]);

  // ═══════════════════════════════════════════════════════════════
  // UPDATE STATUS + AUTO-INVOICE ON CONFIRM
  // ═══════════════════════════════════════════════════════════════
  const handleStatusUpdate = async (
    bookingId: string,
    newStatus: "confirmed" | "cancelled" | "completed"
  ) => {
    if (!firestore) return;
    if (
      newStatus === "cancelled" &&
      !confirm("Booking cancel karein? Yeh action undo nahi ho sakti.")
    )
      return;

    setUpdatingId(bookingId);
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus === "confirmed") {
        const bookingRef = doc(firestore, "locationBookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const booking = bookingSnap.data();

          const invoiceSettings = {
            advancePercent: profile?.invoiceSettings?.advancePercent ?? 30,
            dueDays: profile?.invoiceSettings?.dueDays ?? 7,
            notes: profile?.invoiceSettings?.notes || "",
          };

          const paymentDetails = profile?.paymentDetails || {};
          const currentSequence = (profile?.invoiceCounter || 0) + 1;

          const invoice = calculateLocationInvoice(
            booking.locationName || "Location Booking",
            booking.date || new Date().toISOString().split("T")[0],
            booking.hours || 1,
            booking.hourlyRate || booking.totalAmount || 0,
            invoiceSettings,
            paymentDetails,
            currentSequence
          );

          updateData.invoice = invoice;
          updateData.invoiceStatus = "sent";
          updateData.advanceReceived = false;

          await updateDoc(doc(firestore, "users", user!.uid), {
            invoiceCounter: increment(1),
          });
        }
      }

      await updateDoc(doc(firestore, "locationBookings", bookingId), updateData);

      if (newStatus === "confirmed") {
        toast({
          title: "✅ Booking confirmed",
          description: "Invoice auto-generate ho gaya. Advance receive hone par WhatsApp invoice bhejein.",
        });
      } else {
        toast({
          title: "✅ Booking updated",
          description: `Status: ${newStatus}`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MARK ADVANCE RECEIVED
  // ═══════════════════════════════════════════════════════════════
  const handleMarkAdvanceReceived = async (bookingId: string) => {
    if (!firestore) return;
    if (!confirm("Confirm karein ke client ne advance bhej diya hai?")) return;

    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(firestore, "locationBookings", bookingId), {
        advanceReceived: true,
        advanceReceivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Advance received",
        description: "Ab aap WhatsApp par client ko invoice bhej sakte hain.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-border/30 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Bookings
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
            Manage <span className="text-primary italic">Bookings</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Photographers ki booking requests dekhein, confirm karein, aur track karein.
          </p>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat
          label="Total"
          value={stats.total.toString()}
          icon={<Calendar className="w-4 h-4" />}
          color="primary"
        />
        <MiniStat
          label="Pending"
          value={stats.pending.toString()}
          icon={<Clock className="w-4 h-4" />}
          color="amber"
        />
        <MiniStat
          label="Revenue"
          value={`Rs. ${stats.revenue.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="green"
        />
        <MiniStat
          label="Pending Amt"
          value={`Rs. ${stats.pendingAmount.toLocaleString()}`}
          icon={<AlertCircle className="w-4 h-4" />}
          color="red"
        />
      </div>

      {/* ═══ FILTERS ═══ */}
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
            placeholder="Search by name, phone, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-card/40 border-border/40"
          />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-card/20" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="bg-card/40 border-border/40 rounded-[2rem] border-dashed">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-10 h-10 text-primary/50" />
            </div>
            <h2 className="text-2xl font-headline font-bold mb-2">
              {searchTerm || activeTab !== "all"
                ? "Koi booking nahi mili"
                : "Abhi koi booking nahi"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchTerm || activeTab !== "all"
                ? "Filters change karein ya search term clear karein."
                : "Jab koi photographer aapki location book karega, woh yahan dikhega."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusUpdate={handleStatusUpdate}
              onMarkAdvanceReceived={handleMarkAdvanceReceived}
              updating={updatingId === booking.id}
            />
          ))}
        </div>
      )}
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
  color: "primary" | "amber" | "green" | "red";
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
    red: {
      border: "border-red-500/20",
      bg: "bg-red-500/5",
      icon: "text-red-400",
      iconBg: "bg-red-500/15",
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
// BOOKING CARD
// ═══════════════════════════════════════════════════════════════

function BookingCard({
  booking,
  onStatusUpdate,
  onMarkAdvanceReceived,
  updating,
}: {
  booking: any;
  onStatusUpdate: (id: string, status: "confirmed" | "cancelled" | "completed") => void;
  onMarkAdvanceReceived: (id: string) => void;
  updating: boolean;
}) {
  const status: string = booking.status || "pending";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const canConfirm = status === "pending";
  const canComplete = status === "confirmed";
  const canCancel = status === "pending" || status === "confirmed";
  const hasInvoice = !!booking.invoice;
  const advanceReceived = booking.advanceReceived === true;
  const canMarkAdvance = status === "confirmed" && hasInvoice && !advanceReceived;
  const canSendWhatsApp = status === "confirmed" && hasInvoice && advanceReceived;

  // ═══ WhatsApp Message Builder ═══
  const buildWhatsAppMessage = () => {
    const inv = booking.invoice || {};
    const pd = inv.paymentDetails || {};

    let msg = `Salam ${booking.clientName || "Client"},\n\n`;
    msg += `✅ Aapki booking *confirm* ho gayi hai!\n\n`;
    msg += `📍 *Location:* ${booking.locationName || "-"}\n`;
    msg += `📅 *Date:* ${booking.date || "-"}\n`;
    if (booking.time) msg += `⏰ *Time:* ${booking.time}\n`;
    msg += `🎉 *Event:* ${booking.eventType || "-"}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total Amount:* Rs. ${booking.totalAmount?.toLocaleString() || 0}\n`;
    msg += `💵 *Advance (${inv.advanceAmount ? Math.round((inv.advanceAmount / (inv.subtotal || 1)) * 100) : 30}%):* Rs. ${inv.advanceAmount?.toLocaleString() || 0}\n`;
    msg += `💳 *Balance:* Rs. ${inv.balanceAmount?.toLocaleString() || 0}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📄 *Invoice #:* ${inv.invoiceNumber || "-"}\n`;
    if (inv.dueDate) {
      msg += `⏰ *Due Date:* ${new Date(inv.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}\n`;
    }
    msg += `\n━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💳 *Payment Details:*\n`;

    if (pd.easypaisaNumber) msg += `💚 EasyPaisa: ${pd.easypaisaNumber}\n`;
    if (pd.jazzcashNumber) msg += `❤️ JazzCash: ${pd.jazzcashNumber}\n`;
    if (pd.bankName) msg += `🏦 Bank: ${pd.bankName}\n`;
    if (pd.accountTitle) msg += `👤 Title: ${pd.accountTitle}\n`;
    if (pd.accountNumber) msg += `🔢 Account: ${pd.accountNumber}\n`;

    if (inv.notes) {
      msg += `\n📝 *Note:* ${inv.notes}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Shukriya,\n*Hafash.pk* 🎬`;

    return msg;
  };

  const whatsappUrl = canSendWhatsApp && booking.clientPhone
    ? `https://wa.me/${booking.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(buildWhatsAppMessage())}`
    : "#";

  return (
    <Card className="bg-card/60 border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 transition-all">
      <CardContent className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left — Client info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-headline font-bold text-base truncate">
                    {booking.clientName || "Client"}
                  </h3>
                </div>
                {booking.locationName && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{booking.locationName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {advanceReceived && (
                  <Badge className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                    <Wallet className="w-2.5 h-2.5" />
                    Advance Received
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
              {booking.clientPhone && (
                <a
                  href={`tel:${booking.clientPhone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {booking.clientPhone}
                </a>
              )}
              {booking.clientEmail && (
                <a
                  href={`mailto:${booking.clientEmail}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors truncate"
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{booking.clientEmail}</span>
                </a>
              )}
              {booking.date && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {booking.date}
                  {booking.time && ` · ${booking.time}`}
                </span>
              )}
              {booking.eventType && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  {booking.eventType}
                </span>
              )}
            </div>

            {booking.message && (
              <div className="p-3 rounded-xl bg-background/40 border border-border/30">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    {booking.message}
                  </p>
                </div>
              </div>
            )}

            {/* Invoice badge */}
            {hasInvoice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Invoice: {booking.invoice.invoiceNumber}
                </p>
                {advanceReceived && (
                  <Badge className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    ✓ Advance Paid
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Right — Amount + Actions */}
          <div className="lg:w-48 flex flex-col justify-between gap-3 lg:border-l lg:border-border/30 lg:pl-5">
            {booking.totalAmount > 0 && (
              <div className="text-center lg:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Amount
                </p>
                <p className="text-2xl font-headline font-bold text-primary">
                  Rs. {booking.totalAmount.toLocaleString()}
                </p>
                {hasInvoice && booking.invoice.advanceAmount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Advance: Rs. {booking.invoice.advanceAmount.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="flex lg:flex-col gap-2 flex-wrap">
              {canConfirm && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate(booking.id, "confirmed")}
                  disabled={updating}
                  className="flex-1 rounded-xl gap-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 font-bold text-[10px] uppercase tracking-widest h-9"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm
                    </>
                  )}
                </Button>
              )}

              {/* Mark Advance Received */}
              {canMarkAdvance && (
                <Button
                  size="sm"
                  onClick={() => onMarkAdvanceReceived(booking.id)}
                  disabled={updating}
                  className="flex-1 rounded-xl gap-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 font-bold text-[10px] uppercase tracking-widest h-9"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Wallet className="w-3.5 h-3.5" />
                      Mark Advance
                    </>
                  )}
                </Button>
              )}

              {/* WhatsApp Invoice — only after advance */}
              {canSendWhatsApp && booking.clientPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl gap-1.5 bg-green-500 text-white hover:bg-green-600 font-bold text-[10px] uppercase tracking-widest h-9 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp Invoice
                </a>
              )}

              {canComplete && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate(booking.id, "completed")}
                  disabled={updating}
                  className="flex-1 rounded-xl gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 font-bold text-[10px] uppercase tracking-widest h-9"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complete
                    </>
                  )}
                </Button>
              )}

              {canCancel && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate(booking.id, "cancelled")}
                  disabled={updating}
                  variant="ghost"
                  className="flex-1 rounded-xl gap-1.5 text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase tracking-widest h-9 border border-destructive/30"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}