/**
 * Hafash Invoice PDF Generator
 * 
 * Generates professional PDF invoices for photographer bookings.
 */

import jsPDF from 'jspdf';
import type { Booking, Invoice } from '@/lib/portfolio-types';

interface InvoicePDFOptions {
  booking: Booking;
  photographer: {
    studioName: string;
    photographerName?: string;
    whatsappNumber?: string;
    city?: string;
    studioLogo?: string;
  };
}

export function generateInvoicePDF({
  booking,
  photographer,
}: InvoicePDFOptions): void {
  if (!booking.invoice) {
    throw new Error('No invoice found for this booking');
  }

  const invoice = booking.invoice;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ─────────────────────────────────────────────────────────────
  // COLORS
  // ─────────────────────────────────────────────────────────────
  const gold: [number, number, number] = [212, 175, 55];
  const dark: [number, number, number] = [26, 25, 22];
  const gray: [number, number, number] = [128, 128, 128];
  const lightGray: [number, number, number] = [240, 240, 240];

  // ─────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────
  
  // Top gold bar
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Studio name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...dark);
  doc.text(photographer.studioName || 'Professional Studio', margin, 30);

  // Photographer name + contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  let headerY = 38;
  if (photographer.photographerName) {
    doc.text(photographer.photographerName, margin, headerY);
    headerY += 5;
  }
  if (photographer.city) {
    doc.text(photographer.city, margin, headerY);
    headerY += 5;
  }
  if (photographer.whatsappNumber) {
    doc.text(`WhatsApp: ${photographer.whatsappNumber}`, margin, headerY);
    headerY += 5;
  }

  // INVOICE label (right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...gold);
  doc.text('INVOICE', pageWidth - margin, 30, { align: 'right' });

  // Invoice number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...gray);
  doc.text(
    `#${invoice.invoiceNumber}`,
    pageWidth - margin,
    40,
    { align: 'right' }
  );

  // ─────────────────────────────────────────────────────────────
  // DIVIDER
  // ─────────────────────────────────────────────────────────────
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(margin, 58, pageWidth - margin, 58);

  // ─────────────────────────────────────────────────────────────
  // BILL TO + INVOICE DETAILS
  // ─────────────────────────────────────────────────────────────
  let y = 68;

  // BILL TO (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('BILL TO', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(booking.clientName || 'Client', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  let clientY = y + 13;
  if (booking.clientPhone) {
    doc.text(`Phone: ${booking.clientPhone}`, margin, clientY);
    clientY += 5;
  }
  if (booking.clientEmail) {
    doc.text(`Email: ${booking.clientEmail}`, margin, clientY);
    clientY += 5;
  }
  if (booking.city) {
    doc.text(`City: ${booking.city}`, margin, clientY);
    clientY += 5;
  }

  // INVOICE DETAILS (right)
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('INVOICE DETAILS', rightX, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, rightX, y + 7, { align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightX, y + 12, { align: 'right' });
  if (booking.eventDate) {
    doc.text(`Event Date: ${formatDate(booking.eventDate)}`, rightX, y + 17, { align: 'right' });
  }
  if (booking.eventType) {
    doc.text(`Event Type: ${booking.eventType}`, rightX, y + 22, { align: 'right' });
  }

  // ─────────────────────────────────────────────────────────────
  // ITEMS TABLE
  // ─────────────────────────────────────────────────────────────
  y = 115;

  // Table header
  doc.setFillColor(...gold);
  doc.rect(margin, y, contentWidth, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', margin + 4, y + 6.5);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 4, y + 6.5, { align: 'right' });

  y += 10;

  // Table row — Package
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(invoice.packageName || 'Photography Package', margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(
    invoice.packagePrice?.toLocaleString() || '0',
    pageWidth - margin - 4,
    y + 8,
    { align: 'right' }
  );

  y += 12;

  // ─────────────────────────────────────────────────────────────
  // TOTALS (Right side)
  // ─────────────────────────────────────────────────────────────
  y += 8;
  const totalsX = pageWidth - margin;
  const totalsLabelX = totalsX - 60;

  // Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text('Total:', totalsLabelX, y);
  doc.text(
    `Rs. ${invoice.packagePrice?.toLocaleString() || '0'}`,
    totalsX,
    y,
    { align: 'right' }
  );

  y += 8;

  // Advance
  doc.setTextColor(...gray);
  doc.text('Advance Received:', totalsLabelX, y);
  doc.text(
    `- Rs. ${invoice.advanceAmount?.toLocaleString() || '0'}`,
    totalsX,
    y,
    { align: 'right' }
  );

  y += 8;

  // Divider
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, y - 2, totalsX, y - 2);

  y += 6;

  // Balance due (highlighted)
  doc.setFillColor(...gold);
  doc.rect(totalsLabelX - 4, y - 5, 64 + 4, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...dark);
  doc.text('Balance Due:', totalsLabelX, y + 2);
  doc.text(
    `Rs. ${invoice.balanceAmount?.toLocaleString() || '0'}`,
    totalsX,
    y + 2,
    { align: 'right' }
  );

  y += 20;

  // ─────────────────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text('NOTES', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    const splitNotes = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(splitNotes, margin, y + 6);
    y += 6 + splitNotes.length * 5 + 5;
  }

  // ─────────────────────────────────────────────────────────────
  // PAYMENT INFO
  // ─────────────────────────────────────────────────────────────
  y += 5;
  
  // Check if there's room, otherwise add page
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 30;
  }

  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('PAYMENT INFORMATION', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(
    'Please complete the balance payment before the event date.',
    margin + 4,
    y + 14
  );
  doc.text(
    'For any queries, contact the studio directly on WhatsApp.',
    margin + 4,
    y + 20
  );

  // ─────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────
  const footerY = pageHeight - 20;

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('Powered by Hafash.pk', pageWidth / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-GB')}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  // ─────────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────────
  const fileName = `${invoice.invoiceNumber}_${booking.clientName?.replace(/\s+/g, '_') || 'Client'}.pdf`;
  doc.save(fileName);
}