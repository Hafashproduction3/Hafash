"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import {
  collection, query, where, onSnapshot
} from "firebase/firestore";
import {
  ArrowLeft, Loader2, Wallet, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Calendar, User, Phone, Search,
  Filter, Download, MessageCircle, ChevronDown, ChevronUp,
  Sparkles, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { HafashLoader } from "@/components/ui/hafash-loader";
import {
  calculatePaymentStats,
  getUpcomingPayments,
  getMonthlyRevenue,
  formatCurrency,
  formatShortCurrency,
  formatDueDate,
} from "@/lib/payment-utils";
import type { Booking } from "@/lib/portfolio-types";

type FilterTab = 'all' | 'pending' | 'overdue' | 'paid';
type ViewMode = 'overview' | 'list';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Fetch bookings
  useEffect(() => {
    if (!firestore || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'bookings'),
      where('photographerId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Booking[];

      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error('[PAYMENTS_LISTENER]', err);
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, user]);

  const stats = useMemo(() => calculatePaymentStats(bookings), [bookings]);
  const upcoming = useMemo(() => getUpcomingPayments(bookings, 20), [bookings]);
  const monthlyRevenue = useMemo(() => getMonthlyRevenue(bookings, 6), [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    let result = bookings.filter(b => b.invoice);
    
    // Filter by status
    if (filter === 'pending') {
      result = result.filter(b => 
        b.invoice?.paymentSchedule?.some(p => p.status !== 'paid')
      );
    } else if (filter === 'overdue') {
      const now = new Date();
      result = result.filter(b => 
        b.invoice?.paymentSchedule?.some(p => 
          p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < now
        )
      );
    } else if (filter === 'paid') {
      result = result.filter(b => 
        b.invoice?.paymentSchedule?.every(p => p.status === 'paid')
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.clientName?.toLowerCase().includes(q) ||
        b.invoice?.invoiceNumber?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
  }, [bookings, filter, searchQuery]);

  const handleSendReminder = (clientName: string, clientPhone: string, amount: number, label: string) => {
    const phone = clientPhone.replace(/\D/g, '');
    const message = `Salam ${clientName},\n\nReminder: Aapki ${label} payment Rs. ${amount.toLocaleString()} pending hai.\n\nPlease jald pay karein.\nShukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (authLoading || loading) return <HafashLoader text="Loading payments..." />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.received + m.pending), 1);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mb-2">
              <Wallet className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Payments</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">Payment Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Saari payments ek jagah — pending, received, overdue</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Value"
            value={formatShortCurrency(stats.totalValue)}
            icon={<Crown className="w-5 h-5" />}
            color="primary"
          />
          <StatCard
            label="Received"
            value={formatShortCurrency(stats.totalReceived)}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Pending"
            value={formatShortCurrency(stats.totalPending)}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
            subtext={`${stats.pendingCount} payments`}
          />
          <StatCard
            label="Overdue"
            value={formatShortCurrency(stats.totalOverdue)}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            subtext={`${stats.overdueCount} payments`}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-card/40 p-1 rounded-xl border border-border/30">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === 'overview'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === 'list'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              All Payments
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OVERVIEW VIEW */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === 'overview' && (
          <>
            {/* Monthly Revenue Chart */}
            <Card className="rounded-[2rem] border-border/40 bg-card/40">
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="font-headline font-bold text-lg">Monthly Revenue</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-muted-foreground">Received</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-amber-500" />
                      <span className="text-muted-foreground">Pending</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2 h-48">
                  {monthlyRevenue.map((m, idx) => {
                    const total = m.received + m.pending;
                    const heightPercent = (total / maxRevenue) * 100;
                    const receivedPercent = total > 0 ? (m.received / total) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-[10px] font-bold text-primary">
                          {total > 0 ? formatShortCurrency(total) : ''}
                        </div>
                        <div
                          className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end"
                          style={{ height: `${Math.max(heightPercent, 5)}%`, minHeight: '20px' }}
                        >
                          <div
                            className="w-full bg-amber-500/60"
                            style={{ height: `${100 - receivedPercent}%` }}
                          />
                          <div
                            className="w-full bg-primary"
                            style={{ height: `${receivedPercent}%` }}
                          />
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {m.month.split(' ')[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Payments */}
            <Card className="rounded-[2rem] border-border/40 bg-card/40">
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h2 className="font-headline font-bold text-lg">Upcoming Payments</h2>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                    {upcoming.length}
                  </Badge>
                </div>

                {upcoming.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Koi pending payment nahi 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((payment, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4",
                          payment.isOverdue
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-background/40 border-border/30"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                            <p className="font-bold text-sm truncate">{payment.clientName}</p>
                            {payment.isOverdue && (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] font-bold">
                                OVERDUE
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-5">{payment.label}</p>
                        </div>

                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                          <p className="font-bold text-primary">{formatCurrency(payment.amount)}</p>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            payment.isOverdue ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {formatDueDate(payment.dueDate)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(
                            payment.clientName,
                            payment.clientPhone,
                            payment.amount,
                            payment.label
                          )}
                          className="rounded-lg gap-1.5 border-green-500/30 text-green-500 hover:bg-green-500/5 shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Remind
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* LIST VIEW */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === 'list' && (
          <>
            {/* Filters + Search */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'overdue', label: 'Overdue' },
                  { key: 'paid', label: 'Paid' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as FilterTab)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                      filter === tab.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Client name ya invoice number..."
                  className="pl-11 h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
                <CardContent className="p-16 text-center">
                  <Wallet className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                  <h3 className="font-headline font-bold text-xl mb-2">Koi payment nahi mila</h3>
                  <p className="text-sm text-muted-foreground">Filters change karein ya search karein</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <PaymentCard key={booking.id} booking={booking} onRemind={handleSendReminder} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

function StatCard({
  label, value, icon, color, subtext
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'amber' | 'red';
  subtext?: string;
}) {
  const colors = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    red: 'text-destructive bg-destructive/10 border-destructive/20',
  }[color];

  return (
    <Card className={cn("rounded-2xl border-2 bg-card/40", colors)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors)}>
            {icon}
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-2xl font-headline font-bold mt-1">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT CARD
// ═══════════════════════════════════════════════════════════════

function PaymentCard({
  booking,
  onRemind,
}: {
  booking: Booking;
  onRemind: (name: string, phone: string, amount: number, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!booking.invoice) return null;

  const invoice = booking.invoice;
  const payments = invoice.paymentSchedule || [];
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalCount = payments.length;
  const now = new Date();
  const hasOverdue = payments.some(p => 
    p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < now
  );

  return (
    <Card className={cn(
      "rounded-2xl border bg-card/80 overflow-hidden",
      hasOverdue ? "border-destructive/30" : "border-border/40"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-lg font-headline font-bold">{booking.clientName}</h3>
            <p className="text-xs text-muted-foreground">
              Invoice #{invoice.invoiceNumber} · {booking.eventType}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasOverdue && (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3 mr-1" />
                OVERDUE
              </Badge>
            )}
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
              {paidCount} / {totalCount} paid
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-background/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
              style={{ width: `${(paidCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Total + Balance */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-background/40 border border-border/30">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total</p>
            <p className="text-sm font-bold mt-1">{formatCurrency(invoice.total)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <p className="text-[9px] uppercase tracking-widest text-green-500 font-bold">Paid</p>
            <p className="text-sm font-bold mt-1 text-green-500">
              {formatCurrency(
                payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
              )}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">Pending</p>
            <p className="text-sm font-bold mt-1 text-amber-500">
              {formatCurrency(
                payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
              )}
            </p>
          </div>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-2"
        >
          <span>Payment Schedule</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Expanded Schedule */}
        {expanded && (
          <div className="space-y-2 pt-2">
            {payments.map((p, idx) => {
              const isOverdue = p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < now;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3 rounded-xl border",
                    p.status === 'paid'
                      ? "bg-green-500/5 border-green-500/20"
                      : isOverdue
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-background/40 border-border/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.status === 'paid' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.label}</p>
                      {p.dueDate && (
                        <p className="text-[9px] text-muted-foreground">
                          {formatDueDate(p.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold">{formatCurrency(p.amount)}</span>
                    {p.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemind(booking.clientName, booking.clientPhone, p.amount, p.label)}
                        className="h-7 px-2 rounded-lg text-green-500 hover:bg-green-500/10"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}