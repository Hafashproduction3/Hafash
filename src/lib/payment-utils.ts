/**
 * Hafash Payment Utilities
 * 
 * Payment calculations, overdue checks, and stats.
 */

import type { Booking, Invoice, PaymentSchedule } from '@/lib/portfolio-types';

// ═══════════════════════════════════════════════════════════════
// PAYMENT STATS
// ═══════════════════════════════════════════════════════════════

export interface PaymentStats {
  totalValue: number;       // Total value of all bookings
  totalReceived: number;    // Money received
  totalPending: number;     // Money pending
  totalOverdue: number;     // Overdue amount
  pendingCount: number;     // Number of pending payments
  overdueCount: number;     // Number of overdue payments
}

export function calculatePaymentStats(bookings: Booking[]): PaymentStats {
  let totalValue = 0;
  let totalReceived = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  const now = new Date();

  bookings.forEach(booking => {
    if (!booking.invoice) return;
    if (booking.status === 'auto_cancelled' || booking.status === 'manually_cancelled') return;

    const invoice = booking.invoice;
    totalValue += invoice.total || 0;

    (invoice.paymentSchedule || []).forEach(payment => {
      if (payment.status === 'paid') {
        totalReceived += payment.amount || 0;
      } else {
        totalPending += payment.amount || 0;
        pendingCount++;

        // Check if overdue
        if (payment.dueDate && new Date(payment.dueDate) < now) {
          totalOverdue += payment.amount || 0;
          overdueCount++;
        }
      }
    });
  });

  return {
    totalValue,
    totalReceived,
    totalPending,
    totalOverdue,
    pendingCount,
    overdueCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// UPCOMING PAYMENTS
// ═══════════════════════════════════════════════════════════════

export interface UpcomingPayment {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  label: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export function getUpcomingPayments(
  bookings: Booking[],
  limit: number = 10
): UpcomingPayment[] {
  const payments: UpcomingPayment[] = [];
  const now = new Date();

  bookings.forEach(booking => {
    if (!booking.id || !booking.invoice) return;
    if (booking.status === 'auto_cancelled' || booking.status === 'manually_cancelled') return;

    (booking.invoice.paymentSchedule || []).forEach(payment => {
      if (payment.status === 'paid') return;
      if (!payment.dueDate) return;

      const dueDate = new Date(payment.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      payments.push({
        bookingId: booking.id!,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        label: payment.label,
        amount: payment.amount,
        dueDate: payment.dueDate,
        isOverdue: dueDate < now,
        daysUntilDue,
      });
    });
  });

  // Sort: overdue first, then by due date
  payments.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return payments.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY REVENUE
// ═══════════════════════════════════════════════════════════════

export interface MonthlyRevenue {
  month: string;      // e.g., "Oct 2026"
  received: number;
  pending: number;
}

export function getMonthlyRevenue(
  bookings: Booking[],
  monthsBack: number = 6
): MonthlyRevenue[] {
  const result: MonthlyRevenue[] = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

    result.push({
      month: monthKey,
      received: 0,
      pending: 0,
    });
  }

  bookings.forEach(booking => {
    if (!booking.invoice) return;

    (booking.invoice.paymentSchedule || []).forEach(payment => {
      if (!payment.dueDate) return;

      const dueDate = new Date(payment.dueDate);
      const monthKey = dueDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      const monthEntry = result.find(m => m.month === monthKey);
      if (monthEntry) {
        if (payment.status === 'paid') {
          monthEntry.received += payment.amount || 0;
        } else {
          monthEntry.pending += payment.amount || 0;
        }
      }
    });
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT PAYMENT SUMMARY
// ═══════════════════════════════════════════════════════════════

export interface ClientPaymentSummary {
  bookingId: string;
  clientName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

export function getClientPaymentSummary(booking: Booking): ClientPaymentSummary | null {
  if (!booking.id || !booking.invoice) return null;

  let paidAmount = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;
  const now = new Date();

  (booking.invoice.paymentSchedule || []).forEach(payment => {
    if (payment.status === 'paid') {
      paidAmount += payment.amount || 0;
    } else {
      pendingAmount += payment.amount || 0;
      if (payment.dueDate && new Date(payment.dueDate) < now) {
        overdueAmount += payment.amount || 0;
      }
    }
  });

  return {
    bookingId: booking.id,
    clientName: booking.clientName,
    totalAmount: booking.invoice.total || 0,
    paidAmount,
    pendingAmount,
    overdueAmount,
  };
}

// ═══════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════

export function formatCurrency(amount: number): string {
  if (!amount && amount !== 0) return 'Rs. 0';
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}

export function formatShortCurrency(amount: number): string {
  if (amount >= 10000000) return `Rs. ${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(1)}k`;
  return `Rs. ${amount}`;
}

export function formatDueDate(dueDate: string): string {
  if (!dueDate) return '—';
  
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} din overdue`;
  if (diffDays === 0) return 'Aaj due';
  if (diffDays === 1) return 'Kal due';
  if (diffDays <= 7) return `${diffDays} din mein`;
  
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}