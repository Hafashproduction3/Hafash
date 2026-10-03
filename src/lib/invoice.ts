/**
 * Hafash Invoice Generator
 * Location owner bookings ke liye
 */

export interface InvoiceSettings {
    advancePercent: number;
    dueDays: number;
    notes?: string;
  }
  
  export interface PaymentDetails {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    easypaisaNumber?: string;
    jazzcashNumber?: string;
  }
  
  export interface LocationInvoice {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    locationName: string;
    bookingDate: string;
    hours: number;
    hourlyRate: number;
    subtotal: number;
    advanceAmount: number;
    balanceAmount: number;
    totalAmount: number;
    notes?: string;
    status: "draft" | "sent" | "paid" | "cancelled";
    paymentDetails?: PaymentDetails;
  }
  
  /**
   * Generate invoice number: INV-LOC-2026-001
   */
  export function generateLocationInvoiceNumber(sequence: number): string {
    const year = new Date().getFullYear();
    const padded = String(sequence).padStart(3, "0");
    return `INV-LOC-${year}-${padded}`;
  }
  
  /**
   * Calculate invoice for a location booking
   */
  export function calculateLocationInvoice(
    locationName: string,
    bookingDate: string,
    hours: number,
    hourlyRate: number,
    settings: InvoiceSettings,
    paymentDetails?: PaymentDetails,
    sequence: number = 1
  ): LocationInvoice {
    const subtotal = hours * hourlyRate;
    const advancePercent = settings.advancePercent ?? 30;
    const dueDays = settings.dueDays ?? 7;
  
    const advanceAmount = Math.round((subtotal * advancePercent) / 100);
    const balanceAmount = subtotal - advanceAmount;
  
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + dueDays);
  
    return {
      invoiceNumber: generateLocationInvoiceNumber(sequence),
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      locationName,
      bookingDate,
      hours,
      hourlyRate,
      subtotal,
      advanceAmount,
      balanceAmount,
      totalAmount: subtotal,
      notes: settings.notes || "",
      status: "draft",
      paymentDetails,
    };
  }