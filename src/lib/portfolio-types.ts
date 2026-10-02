/**
 * Hafash Portfolio & Booking Types
 */

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO PHOTOS
// ═══════════════════════════════════════════════════════════════

export interface PortfolioPhoto {
  id: string;
  url: string;
  thumbUrl?: string;
  storageKey: string;
  thumbKey?: string;
  caption?: string;
  order: number;
  uploadedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// BOOKING STATUS
// ═══════════════════════════════════════════════════════════════

export type BookingStatus =
  | 'pending'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_changes_requested'
  | 'invoice_sent'
  | 'advance_paid'
  | 'event_paid'
  | 'completed'
  | 'auto_cancelled'
  | 'manually_cancelled';

// ═══════════════════════════════════════════════════════════════
// BOOKING
// ═══════════════════════════════════════════════════════════════

export interface Booking {
  id?: string;
  photographerId: string;
  photographerSubdomain: string;

  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;

  // Event info
  eventDate: string;
  eventType: string;
  city: string;
  budget?: string;
  message?: string;
  packageSelected?: string;

  // Status
  status: BookingStatus;

  // Quote (photographer bheje)
  quote?: Quote;

  // Client approval (signature)
  clientApproval?: ClientApproval;

  // Invoice
  invoice?: Invoice;

  // Advance deadline
  advanceDeadline?: string;

  // Payment tracking
  payments?: Payment[];

  // Cancellation
  cancellation?: {
    reason: string;
    cancelledAt: string;
    cancelledBy: 'system' | 'photographer' | 'client';
  };

  createdAt: any;
  updatedAt: any;
}

// ═══════════════════════════════════════════════════════════════
// QUOTE (Photographer bheje)
// ═══════════════════════════════════════════════════════════════

export interface Quote {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;

  // Package
  packageName: string;
  packagePrice: number;
  packageDescription: string;

  // Extra services
  extras: QuoteExtra[];

  // Payment schedule
  paymentSchedule: PaymentSchedule[];

  // Deliverables
  deliverables: Deliverable[];

  // Data delivery
  dataDeliveryDate: string;
  dataDeliveryMethod: string;

  // Terms
  termsAndConditions: string;
  cancellationPolicy: string;

  // Totals
  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  notes?: string;
}

export interface QuoteExtra {
  name: string;
  price: number;
  description: string;
}

export interface PaymentSchedule {
  label: string;
  percentage: number;
  amount: number;
  dueDate: string;
  dueDaysAfterAccept?: number; // e.g., 3 din
  status: 'pending' | 'paid';
}

export interface Deliverable {
  name: string;
  quantity: number;
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT APPROVAL (Signature)
// ═══════════════════════════════════════════════════════════════

export interface ClientApproval {
  signature: string;      // Base64 image (data:image/png;base64,...)
  typedName: string;      // Full name typed
  agreedToTerms: boolean; // Checkbox
  acceptedAt: string;     // ISO timestamp
  deviceInfo?: string;    // Browser/OS
  method: 'canvas_signature_v1';
}

// ═══════════════════════════════════════════════════════════════
// INVOICE
// ═══════════════════════════════════════════════════════════════

export type InvoiceStatus = 'draft' | 'sent' | 'partial_paid' | 'paid' | 'cancelled';

export interface Invoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  packageName: string;
  packagePrice: number;
  extrasTotal: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentSchedule: PaymentSchedule[];
  dataDeliveryDate: string;
  dataDeliveryMethod: string;
  termsAndConditions: string;
  cancellationPolicy: string;
  notes?: string;
  status: InvoiceStatus;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT (Tracking)
// ═══════════════════════════════════════════════════════════════

export interface Payment {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'overdue';
  method?: 'cash' | 'easypaisa' | 'jazzcash' | 'bank' | 'other';
  reference?: string;
}

// ═══════════════════════════════════════════════════════════════
// PACKAGE (Booking Form)
// ═══════════════════════════════════════════════════════════════

export interface BookingPackage {
  name: string;
  price: number;
  features: string[];
  advancePercent?: number;
}

// ═══════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════

export const EVENT_TYPES = [
  'Wedding',
  'Barat',
  'Walima',
  'Mehndi',
  'Nikah',
  'Engagement',
  'Birthday',
  'Corporate Event',
  'Portrait Session',
  'Other',
];

// ═══════════════════════════════════════════════════════════════
// PAKISTAN CITIES
// ═══════════════════════════════════════════════════════════════

export const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Gujranwala',
  'Sialkot',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Larkana',
  'Other',
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(3, '0');
  return `INV-${year}-${padded}`;
}

export function generateQuoteNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(3, '0');
  return `Q-${year}-${padded}`;
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function calculateInvoice(
  packageName: string,
  packagePrice: number,
  extrasTotal: number,
  advancePercent: number = 30,
  dueDays: number = 7
): Omit<Invoice, 'invoiceNumber' | 'status' | 'paymentSchedule' | 'dataDeliveryDate' | 'dataDeliveryMethod' | 'termsAndConditions' | 'cancellationPolicy'> {
  const subtotal = packagePrice + extrasTotal;
  const advanceAmount = Math.round((subtotal * advancePercent) / 100);
  const balanceAmount = subtotal - advanceAmount;

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + dueDays);

  return {
    issueDate: now.toISOString(),
    dueDate: dueDate.toISOString(),
    packageName,
    packagePrice,
    extrasTotal,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    advanceAmount,
    balanceAmount,
    notes: '',
  };
}