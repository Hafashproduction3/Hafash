"use client";

import Link from "next/link";
import {
  Wallet, TrendingUp, AlertTriangle, ArrowRight,
  CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calculatePaymentStats,
  getUpcomingPayments,
  formatShortCurrency,
  formatCurrency,
  formatDueDate,
} from "@/lib/payment-utils";
import type { Booking } from "@/lib/portfolio-types";
import { cn } from "@/lib/utils";

export function PaymentWidget({ bookings }: { bookings: Booking[] }) {
  const stats = calculatePaymentStats(bookings);
  const upcoming = getUpcomingPayments(bookings, 3);

  // Agar koi payment nahi hai, to widget nahi dikhao
  if (stats.totalValue === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 via-card/60 to-background p-5 lg:p-6 shadow-lg">
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-white flex items-center gap-2">
                Payments Overview
                {stats.overdueCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/15 border border-destructive/30 px-2 py-0.5 rounded-md animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.overdueCount} overdue
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.pendingCount > 0
                  ? `${stats.pendingCount} pending payments`
                  : "Sab payments clear hain"}
              </p>
            </div>
          </div>

          <Link href="/dashboard/payments">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500/50"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total Value"
            value={formatShortCurrency(stats.totalValue)}
            color="primary"
          />
          <MiniStat
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Received"
            value={formatShortCurrency(stats.totalReceived)}
            color="green"
          />
          <MiniStat
            icon={<Clock className="w-4 h-4" />}
            label="Pending"
            value={formatShortCurrency(stats.totalPending)}
            color="amber"
          />
          <MiniStat
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Overdue"
            value={formatShortCurrency(stats.totalOverdue)}
            color="red"
          />
        </div>

        {/* Upcoming Payments */}
        {upcoming.length > 0 && (
          <div className="pt-4 border-t border-emerald-500/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Upcoming Payments
            </p>
            {upcoming.map((payment, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-xl border text-sm",
                  payment.isOverdue
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-background/40 border-border/30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate">{payment.clientName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{payment.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-xs">{formatCurrency(payment.amount)}</p>
                  <p
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider",
                      payment.isOverdue ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {formatDueDate(payment.dueDate)}
                  </p>
                </div>
              </div>
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
  icon, label, value, color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'green' | 'amber' | 'red';
}) {
  const colorClasses = {
    primary: {
      border: 'border-primary/20',
      bg: 'bg-primary/5',
      icon: 'text-primary',
      iconBg: 'bg-primary/15',
      value: 'text-white',
    },
    green: {
      border: 'border-green-500/20',
      bg: 'bg-green-500/5',
      icon: 'text-green-400',
      iconBg: 'bg-green-500/15',
      value: 'text-green-400',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      value: 'text-amber-400',
    },
    red: {
      border: 'border-destructive/20',
      bg: 'bg-destructive/5',
      icon: 'text-destructive',
      iconBg: 'bg-destructive/15',
      value: 'text-destructive',
    },
  }[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3",
        colorClasses.border,
        colorClasses.bg
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            colorClasses.iconBg
          )}
        >
          <div className={colorClasses.icon}>{icon}</div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-base font-headline font-bold leading-tight mt-0.5", colorClasses.value)}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}