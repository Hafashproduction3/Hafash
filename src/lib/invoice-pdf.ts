/**
 * Hafash Invoice PDF Generator — With Signature + Payment Schedule
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
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const gold: [number, number, number] = [212, 175, 55];
  const dark: [number, number, number] = [26, 25, 22];
  const gray: [number, number, number] = [128, 128, 128];
  const lightGray: [number, number, number] = [245, 245, 245];
  const red: [number, number, number] = [220, 53, 69];
  const green: [number, number, number] = [34, 139, 34];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
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

  const formatCurrency = (amount: number) => {
    return `Rs. ${(amount || 0).toLocaleString()}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...dark);
  doc.text(photographer.studioName || 'Professional Studio', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  let headerY = 28;
  if (photographer.photographerName) {
    doc.text(photographer.photographerName, margin, headerY);
    headerY += 4;
  }
  if (photographer.city) {
    doc.text(photographer.city, margin, headerY);
    headerY += 4;
  }
  if (photographer.whatsappNumber) {
    doc.text(`WhatsApp: ${photographer.whatsappNumber}`, margin, headerY);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...gold);
  doc.text('INVOICE', pageWidth - margin, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, 30, { align: 'right' });

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(margin, 40, pageWidth - margin, 40);

  // ═══════════════════════════════════════════════════════════════
  // BILL TO + INVOICE DETAILS
  // ═══════════════════════════════════════════════════════════════
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text('BILL TO', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...dark);
  doc.text(booking.clientName || 'Client', margin, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  let clientY = y + 11;
  if (booking.clientPhone) {
    doc.text(`Phone: ${booking.clientPhone}`, margin, clientY);
    clientY += 4;
  }
  if (booking.clientEmail) {
    doc.text(`Email: ${booking.clientEmail}`, margin, clientY);
    clientY += 4;
  }
  if (booking.city) {
    doc.text(`City: ${booking.city}`, margin, clientY);
  }

  // Invoice details right
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text('INVOICE DETAILS', rightX, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, rightX, y + 6, { align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightX, y + 10, { align: 'right' });
  if (booking.eventDate) {
    doc.text(`Event: ${formatDate(booking.eventDate)}`, rightX, y + 14, { align: 'right' });
  }
  if (booking.eventType) {
    doc.text(`Type: ${booking.eventType}`, rightX, y + 18, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════════
  // PACKAGE + EXTRAS TABLE
  // ═══════════════════════════════════════════════════════════════
  y = 85;

  doc.setFillColor(...gold);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', margin + 3, y + 5.5);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Package row
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(invoice.packageName || 'Photography Package', margin + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(invoice.packagePrice), pageWidth - margin - 3, y + 7, { align: 'right' });
  y += 10;

  // Extras rows
  const extras = (booking.quote?.extras || []);
  if (extras.length > 0) {
    extras.forEach((extra) => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 10, pageWidth - margin, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text(extra.name || 'Extra Service', margin + 3, y + 6.5);
      doc.text(formatCurrency(extra.price), pageWidth - margin - 3, y + 6.5, { align: 'right' });
      y += 10;
    });
  }

  // ─── TOTALS ───
  y += 5;
  const totalsX = pageWidth - margin;
  const totalsLabelX = totalsX - 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text('Subtotal:', totalsLabelX, y);
  doc.text(formatCurrency(invoice.subtotal), totalsX, y, { align: 'right' });
  y += 5;

  if (invoice.discount > 0) {
    doc.setTextColor(...green);
    doc.text('Discount:', totalsLabelX, y);
    doc.text(`- ${formatCurrency(invoice.discount)}`, totalsX, y, { align: 'right' });
    y += 5;
  }

  if (invoice.tax > 0) {
    doc.setTextColor(...gray);
    doc.text('Tax:', totalsLabelX, y);
    doc.text(formatCurrency(invoice.tax), totalsX, y, { align: 'right' });
    y += 5;
  }

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, y, totalsX, y);
  y += 6;

  doc.setFillColor(...gold);
  doc.rect(totalsLabelX - 3, y - 4, 53 + 3, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text('TOTAL:', totalsLabelX, y + 1.5);
  doc.text(formatCurrency(invoice.total), totalsX, y + 1.5, { align: 'right' });
  y += 14;

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT SCHEDULE
  // ═══════════════════════════════════════════════════════════════
  if (invoice.paymentSchedule && invoice.paymentSchedule.length > 0) {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text('PAYMENT SCHEDULE', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    doc.text('PAYMENT', margin + 3, y + 5);
    doc.text('DUE', margin + 90, y + 5);
    doc.text('STATUS', margin + 120, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 7;

    invoice.paymentSchedule.forEach((p, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 8, pageWidth - margin, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text(`${idx + 1}. ${p.label}`, margin + 3, y + 5);
      doc.text(p.dueDate ? formatDate(p.dueDate) : `${p.dueDaysAfterAccept || 3} din`, margin + 90, y + 5);

      if (p.status === 'paid') {
        doc.setTextColor(...green);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ PAID', margin + 120, y + 5);
      } else {
        doc.setTextColor(...red);
        doc.setFont('helvetica', 'bold');
        doc.text('PENDING', margin + 120, y + 5);
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text(formatCurrency(p.amount), pageWidth - margin - 3, y + 5, { align: 'right' });

      y += 8;
    });

    y += 6;
  }

  // ═══════════════════════════════════════════════════════════════
  // DELIVERABLES
  // ═══════════════════════════════════════════════════════════════
  const deliverables = booking.quote?.deliverables || [];
  if (deliverables.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text('DELIVERABLES', margin, y);
    y += 6;

    deliverables.forEach((d) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text(`• ${d.name}`, margin + 3, y);
      doc.setTextColor(...gray);
      doc.text(`Qty: ${d.quantity}`, margin + 100, y);
      y += 5;
    });

    y += 4;
  }

  // Data Delivery
  if (invoice.dataDeliveryDate) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(...lightGray);
    doc.rect(margin, y, contentWidth, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.text('DATA DELIVERY', margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(`Date: ${formatDate(invoice.dataDeliveryDate)}`, margin + 3, y + 10);
    if (invoice.dataDeliveryMethod) {
      doc.text(`Method: ${invoice.dataDeliveryMethod}`, margin + 70, y + 10);
    }
    y += 18;
  }

  // ═══════════════════════════════════════════════════════════════
  // TERMS & CONDITIONS
  // ═══════════════════════════════════════════════════════════════
  if (invoice.termsAndConditions) {
    if (y > pageHeight - 70) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text('TERMS & CONDITIONS', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    const termsLines = doc.splitTextToSize(invoice.termsAndConditions, contentWidth);
    doc.text(termsLines, margin, y);
    y += termsLines.length * 3.5 + 4;

    if (invoice.cancellationPolicy) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...gold);
      doc.text('CANCELLATION POLICY', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      const cancelLines = doc.splitTextToSize(invoice.cancellationPolicy, contentWidth);
      doc.text(cancelLines, margin, y);
      y += cancelLines.length * 3.5 + 4;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CLIENT APPROVAL / SIGNATURE
  // ═══════════════════════════════════════════════════════════════
  if (booking.clientApproval?.signature) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentWidth, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.text('CLIENT APPROVAL', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(`Accepted by: ${booking.clientApproval.typedName}`, margin + 4, y + 13);

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    const acceptedDate = new Date(booking.clientApproval.acceptedAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Date: ${acceptedDate}`, margin + 4, y + 18);

    // Signature image
    try {
      doc.addImage(booking.clientApproval.signature, 'PNG', margin + 4, y + 22, 60, 16);
    } catch (e) {
      // Silent fail
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(
      'Digitally accepted & signed via Hafash platform',
      pageWidth - margin - 4,
      y + 38,
      { align: 'right' }
    );

    y += 46;
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════
  const footerY = pageHeight - 12;

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text('Powered by Hafash.pk', pageWidth / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')} | Invoice #${invoice.invoiceNumber}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  // ═══════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════
  const clientSafe = (booking.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${invoice.invoiceNumber}_${clientSafe}.pdf`;
  doc.save(fileName);
}