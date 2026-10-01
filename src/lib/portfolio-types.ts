/**
 * Hafash Portfolio & Booking Types
 * 
 * Types for portfolio photos, bookings, and invoices.
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
  // BOOKING
  // ═══════════════════════════════════════════════════════════════
  
  export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
  
  export interface Booking {
    id?: string;
    photographerId: string;
    photographerSubdomain: string;
    
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    
    eventDate: string;
    eventType: string;
    city: string;
    budget?: string;
    message?: string;
    packageSelected?: string;
    
    status: BookingStatus;
    invoice?: Invoice;
    
    createdAt: any;
    updatedAt: any;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INVOICE
  // ═══════════════════════════════════════════════════════════════
  
  export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';
  
  export interface Invoice {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    packageName: string;
    packagePrice: number;
    advanceAmount: number;
    balanceAmount: number;
    notes?: string;
    status: InvoiceStatus;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PACKAGE
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
  // CITIES (Pakistan)
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
  // HELPER: Generate Invoice Number
  // ═══════════════════════════════════════════════════════════════
  
  export function generateInvoiceNumber(sequence: number): string {
    const year = new Date().getFullYear();
    const padded = String(sequence).padStart(3, '0');
    return `INV-${year}-${padded}`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // HELPER: Calculate Invoice
  // ═══════════════════════════════════════════════════════════════
  
  export function calculateInvoice(
    packageName: string,
    packagePrice: number,
    advancePercent: number = 30,
    dueDays: number = 7
  ): Omit<Invoice, 'invoiceNumber' | 'status'> {
    const advanceAmount = Math.round((packagePrice * advancePercent) / 100);
    const balanceAmount = packagePrice - advanceAmount;
    
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + dueDays);
    
    return {
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      packageName,
      packagePrice,
      advanceAmount,
      balanceAmount,
      notes: '',
    };
  }