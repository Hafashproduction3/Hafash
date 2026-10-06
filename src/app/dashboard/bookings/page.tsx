"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import {
  collection, query, where, onSnapshot, doc, getDoc
} from "firebase/firestore";
import {
  Calendar, User, Mail, Phone, MapPin, MessageSquare,
  CheckCircle2, XCircle, Clock, Loader2, ArrowLeft,
  FileText, Trash2, Check, X, Crown, AlertTriangle,
  Download, Edit3, Save, Send, Plus, Minus, Sparkles,
  MessageCircle, Copy
} from "lucide-react";
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { HafashLoader } from "@/components/ui/hafash-loader";
import {
  acceptBooking,
  rejectBooking,
  deleteBooking,
  updateInvoice,
  markBookingCompleted,
} from "@/app/actions/portfolio";
import {
  createQuote,
  markAdvancePaid,
  markPaymentPaid,
  cancelBooking,
} from "@/app/actions/quotes";
import type { Booking, Invoice, Quote, QuoteExtra, PaymentSchedule, Deliverable } from "@/lib/portfolio-types";

type FilterTab = 'all' | 'pending' | 'quote_sent' | 'quote_accepted' | 'advance_paid' | 'completed' | 'cancelled';

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Quote Builder
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [quoteForm, setQuoteForm] = useState<Quote>(getInitialQuote());

  // Invoice Editor
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [invoiceEdit, setInvoiceEdit] = useState<Partial<Invoice>>({});

  // Success Modal (after quote sent)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedQuoteLink, setGeneratedQuoteLink] = useState("");

  function getInitialQuote(): Quote {
    return {
      quoteNumber: '',
      issueDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      packageName: '',
      packagePrice: 0,
      packageDescription: '',
      extras: [],
      paymentSchedule: [
        { label: 'Advance (Booking)', percentage: 30, amount: 0, dueDate: '', dueDaysAfterAccept: 3, status: 'pending' },
        { label: 'Event Day Payment', percentage: 40, amount: 0, dueDate: '', status: 'pending' },
        { label: 'Delivery Payment', percentage: 30, amount: 0, dueDate: '', status: 'pending' },
      ],
      deliverables: [
        { name: 'Edited Photos', quantity: 300, description: 'High-res edited' },
        { name: 'Album', quantity: 1, description: 'Premium album' },
      ],
      dataDeliveryDate: '',
      dataDeliveryMethod: 'Google Drive + Pen Drive',
      termsAndConditions: 'Booking confirm hogi advance payment ke baad. Advance non-refundable hai. Event date change 7 din pehle batana zaroori hai.',
      cancellationPolicy: 'Event se 15 din pehle cancel — 50% refund. 7 din se kam — no refund.',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      notes: '',
    };
  }

  // Fetch photographer
  useEffect(() => {
    async function fetchPhotographer() {
      if (!firestore || !user) return;
      try {
        const snap = await getDoc(doc(firestore, 'publicProfiles', user.uid));
        if (snap.exists()) setPhotographer(snap.data());
      } catch (err) {
        console.error('[PHOTOGRAPHER_FETCH]', err);
      }
    }
    fetchPhotographer();
  }, [firestore, user]);

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

      data.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });

      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error('[BOOKINGS_LISTENER]', err);
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, user]);

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    if (filter === 'cancelled') {
      return bookings.filter(b => b.status === 'auto_cancelled' || b.status === 'manually_cancelled');
    }
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    quote_sent: bookings.filter(b => b.status === 'quote_sent').length,
    quote_accepted: bookings.filter(b => b.status === 'quote_accepted' || b.status === 'invoice_sent').length,
    advance_paid: bookings.filter(b => b.status === 'advance_paid').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'auto_cancelled' || b.status === 'manually_cancelled').length,
  }), [bookings]);

  // ═══════════════════════════════════════════════════════════════
  // QUOTE BUILDER
  // ═══════════════════════════════════════════════════════════════

  const openQuoteBuilder = (booking: Booking) => {
    setSelectedBooking(booking);
    
    const initial = getInitialQuote();
    initial.packageName = booking.packageSelected || 'Custom Package';
    initial.dataDeliveryDate = booking.eventDate 
      ? new Date(new Date(booking.eventDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : '';
    
    setQuoteForm(initial);
    setShowQuoteBuilder(true);
  };

  const updateQuoteField = (field: keyof Quote, value: any) => {
    setQuoteForm(prev => ({ ...prev, [field]: value }));
  };

  const recalcTotals = () => {
    const packagePrice = quoteForm.packagePrice || 0;
    const extrasTotal = (quoteForm.extras || []).reduce((sum, e) => sum + (e.price || 0), 0);
    const subtotal = packagePrice + extrasTotal;
    const total = subtotal - (quoteForm.discount || 0) + (quoteForm.tax || 0);

    const updatedSchedule = (quoteForm.paymentSchedule || []).map(p => ({
      ...p,
      amount: Math.round((total * p.percentage) / 100),
    }));

    setQuoteForm(prev => ({
      ...prev,
      subtotal,
      total,
      paymentSchedule: updatedSchedule,
    }));
  };

  useEffect(() => {
    recalcTotals();
  }, [quoteForm.packagePrice, quoteForm.extras, quoteForm.discount, quoteForm.tax]);

  const handleAddExtra = () => {
    setQuoteForm(prev => ({
      ...prev,
      extras: [...(prev.extras || []), { name: '', price: 0, description: '' }],
    }));
  };

  const handleRemoveExtra = (idx: number) => {
    setQuoteForm(prev => ({
      ...prev,
      extras: (prev.extras || []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateExtra = (idx: number, field: keyof QuoteExtra, value: any) => {
    setQuoteForm(prev => {
      const newExtras = [...(prev.extras || [])];
      newExtras[idx] = { ...newExtras[idx], [field]: value };
      return { ...prev, extras: newExtras };
    });
  };

  const handleAddDeliverable = () => {
    setQuoteForm(prev => ({
      ...prev,
      deliverables: [...(prev.deliverables || []), { name: '', quantity: 0, description: '' }],
    }));
  };

  const handleRemoveDeliverable = (idx: number) => {
    setQuoteForm(prev => ({
      ...prev,
      deliverables: (prev.deliverables || []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateDeliverable = (idx: number, field: keyof Deliverable, value: any) => {
    setQuoteForm(prev => {
      const newD = [...(prev.deliverables || [])];
      newD[idx] = { ...newD[idx], [field]: value };
      return { ...prev, deliverables: newD };
    });
  };

  const handleUpdateSchedule = (idx: number, field: keyof PaymentSchedule, value: any) => {
    setQuoteForm(prev => {
      const newS = [...(prev.paymentSchedule || [])];
      newS[idx] = { ...newS[idx], [field]: value };
      return { ...prev, paymentSchedule: newS };
    });
  };

  const handleSaveQuote = async () => {
    if (!selectedBooking?.id) return;
    if (!quoteForm.packageName || !quoteForm.packagePrice) {
      toast({ variant: 'destructive', title: 'Package name aur price zaroori hai' });
      return;
    }

    setProcessingId(selectedBooking.id);
    try {
      const result = await createQuote(selectedBooking.id, quoteForm);
      if (!result.success) throw new Error(result.error);

      const link = `${window.location.origin}/quote/${result.token}`;
      setGeneratedQuoteLink(link);
      setShowQuoteBuilder(false);
      setShowSuccessModal(true);

      toast({
        title: '✅ Quote Sent',
        description: `Quote ${result.quoteNumber} ready hai`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleShareOnWhatsApp = () => {
    if (!selectedBooking || !generatedQuoteLink) return;
    const phone = selectedBooking.clientPhone.replace(/\D/g, '');
    const message = `Salam ${selectedBooking.clientName},\n\nAapka quote ready hai Hafash se:\n\n${generatedQuoteLink}\n\nQuote dekh kar accept ya reject karein. Shukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedQuoteLink);
    toast({ title: 'Link copied!' });
  };

  // ═══════════════════════════════════════════════════════════════
  // OTHER ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleMarkAdvancePaid = async (booking: Booking) => {
    if (!booking.id) return;
    if (!confirm('Advance payment mil gayi? Booking confirm ho jayegi.')) return;

    setProcessingId(booking.id);
    try {
      const result = await markAdvancePaid(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({ title: '✅ Advance marked as received' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!booking.id) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    setProcessingId(booking.id);
    try {
      const result = await cancelBooking(booking.id, reason);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Booking cancelled' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (booking: Booking) => {
    if (!booking.id) return;
    if (!confirm('Yeh booking permanently delete karein?')) return;

    setProcessingId(booking.id);
    try {
      const result = await deleteBooking(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Booking deleted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaymentPaid = async (booking: Booking, index: number) => {
    if (!booking.id) return;
    if (!confirm('Yeh payment mil gayi?')) return;

    setProcessingId(booking.id);
    try {
      const result = await markPaymentPaid(booking.id, index);
      if (!result.success) throw new Error(result.error);
      toast({ title: '✅ Payment marked as paid' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) return <HafashLoader text="Loading bookings..." />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mb-2">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Bookings</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">Booking Requests</h1>
            <p className="text-muted-foreground text-sm mt-1">Quote bhejein, advance track karein, invoices manage karein</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'quote_sent', label: 'Quote Sent', count: counts.quote_sent },
            { key: 'quote_accepted', label: 'Accepted', count: counts.quote_accepted },
            { key: 'advance_paid', label: 'Advance Paid', count: counts.advance_paid },
            { key: 'completed', label: 'Completed', count: counts.completed },
            { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as FilterTab)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5",
                filter === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:border-primary/30"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary/20 text-[9px] flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filtered.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-border/40 bg-card/40">
            <CardContent className="p-16 text-center space-y-4">
              <Calendar className="w-16 h-16 text-primary mx-auto opacity-50" />
              <h3 className="font-headline font-bold text-xl">Koi booking nahi</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Jab koi client aapke subdomain portfolio se booking karega, toh yahan dikhega.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                processing={processingId === booking.id}
                onCreateQuote={() => openQuoteBuilder(booking)}
                onMarkAdvance={() => handleMarkAdvancePaid(booking)}
                onMarkPayment={(idx) => handleMarkPaymentPaid(booking, idx)}
                onCancel={() => handleCancelBooking(booking)}
                onDelete={() => handleDelete(booking)}
                onEditInvoice={() => {
                  setSelectedBooking(booking);
                  setInvoiceEdit(booking.invoice || {});
                  setShowInvoiceEditor(true);
                }}
                onDownloadPDF={() => {
                  setSelectedBooking(booking);
                  setTimeout(() => {
                    if (booking.invoice) {
                      try {
                        generateInvoicePDF({
                          booking,
                          photographer: {
                            studioName: photographer?.studioName || 'Professional Studio',
                            photographerName: photographer?.photographerName,
                            whatsappNumber: photographer?.whatsappNumber,
                            city: photographer?.city,
                          },
                        });
                      } catch (e: any) {
                        toast({ variant: 'destructive', title: 'PDF failed', description: e.message });
                      }
                    }
                  }, 100);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUOTE BUILDER MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showQuoteBuilder && selectedBooking && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-start justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl rounded-[2rem] my-8 border-primary/30">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-2xl">Create Quote</h2>
                    <p className="text-xs text-muted-foreground">For {selectedBooking.clientName}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowQuoteBuilder(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Package */}
              <div className="space-y-3 p-5 rounded-2xl bg-background/40 border border-border/30">
                <Label className="text-primary font-bold">📦 Package</Label>
                <Input
                  value={quoteForm.packageName}
                  onChange={(e) => updateQuoteField('packageName', e.target.value)}
                  placeholder="Package name (e.g., Gold Wedding Package)"
                  className="h-12 rounded-xl"
                />
                <Textarea
                  value={quoteForm.packageDescription}
                  onChange={(e) => updateQuoteField('packageDescription', e.target.value)}
                  placeholder="Package description"
                  className="rounded-xl min-h-[60px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Package Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={quoteForm.packagePrice}
                      onChange={(e) => updateQuoteField('packagePrice', Number(e.target.value))}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Discount (Rs.)</Label>
                    <Input
                      type="number"
                      value={quoteForm.discount}
                      onChange={(e) => updateQuoteField('discount', Number(e.target.value))}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Services */}
              <div className="space-y-3 p-5 rounded-2xl bg-background/40 border border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-primary font-bold">➕ Extra Services</Label>
                  <Button size="sm" variant="outline" onClick={handleAddExtra} className="rounded-lg gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {(quoteForm.extras || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No extras added</p>
                ) : (
                  (quoteForm.extras || []).map((extra, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={extra.name}
                          onChange={(e) => handleUpdateExtra(idx, 'name', e.target.value)}
                          placeholder="Service name"
                          className="h-10 rounded-lg"
                        />
                        <Input
                          type="number"
                          value={extra.price}
                          onChange={(e) => handleUpdateExtra(idx, 'price', Number(e.target.value))}
                          placeholder="Price"
                          className="h-10 rounded-lg"
                        />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveExtra(idx)} className="h-10 w-10 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Schedule */}
              <div className="space-y-3 p-5 rounded-2xl bg-background/40 border border-border/30">
                <Label className="text-primary font-bold">💰 Payment Schedule</Label>
                {(quoteForm.paymentSchedule || []).map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      value={p.label}
                      onChange={(e) => handleUpdateSchedule(idx, 'label', e.target.value)}
                      className="col-span-5 h-10 rounded-lg"
                    />
                    <Input
                      type="number"
                      value={p.percentage}
                      onChange={(e) => handleUpdateSchedule(idx, 'percentage', Number(e.target.value))}
                      className="col-span-2 h-10 rounded-lg"
                    />
                    <span className="col-span-2 text-xs text-muted-foreground text-right">
                      Rs. {p.amount?.toLocaleString()}
                    </span>
                    {idx === 0 && (
                      <Input
                        type="number"
                        value={p.dueDaysAfterAccept || 3}
                        onChange={(e) => handleUpdateSchedule(idx, 'dueDaysAfterAccept', Number(e.target.value))}
                        placeholder="Days"
                        className="col-span-3 h-10 rounded-lg"
                      />
                    )}
                    {idx !== 0 && (
                      <Input
                        type="date"
                        value={p.dueDate}
                        onChange={(e) => handleUpdateSchedule(idx, 'dueDate', e.target.value)}
                        className="col-span-3 h-10 rounded-lg"
                      />
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground italic">
                  Advance deadline: {quoteForm.paymentSchedule[0]?.dueDaysAfterAccept || 3} din quote accept hone ke baad
                </p>
              </div>

              {/* Deliverables */}
              <div className="space-y-3 p-5 rounded-2xl bg-background/40 border border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-primary font-bold">🎁 Deliverables</Label>
                  <Button size="sm" variant="outline" onClick={handleAddDeliverable} className="rounded-lg gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {(quoteForm.deliverables || []).map((d, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <Input
                        value={d.name}
                        onChange={(e) => handleUpdateDeliverable(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="col-span-6 h-10 rounded-lg"
                      />
                      <Input
                        type="number"
                        value={d.quantity}
                        onChange={(e) => handleUpdateDeliverable(idx, 'quantity', Number(e.target.value))}
                        placeholder="Qty"
                        className="col-span-2 h-10 rounded-lg"
                      />
                      <Input
                        value={d.description}
                        onChange={(e) => handleUpdateDeliverable(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="col-span-4 h-10 rounded-lg"
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleRemoveDeliverable(idx)} className="h-10 w-10 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Data Delivery */}
              <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-background/40 border border-border/30">
                <div>
                  <Label>📅 Data Delivery Date</Label>
                  <Input
                    type="date"
                    value={quoteForm.dataDeliveryDate}
                    onChange={(e) => updateQuoteField('dataDeliveryDate', e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label>📦 Delivery Method</Label>
                  <Input
                    value={quoteForm.dataDeliveryMethod}
                    onChange={(e) => updateQuoteField('dataDeliveryMethod', e.target.value)}
                    placeholder="Google Drive, Pen Drive, etc."
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3 p-5 rounded-2xl bg-background/40 border border-border/30">
                <Label className="text-primary font-bold">📜 Terms & Conditions</Label>
                <Textarea
                  value={quoteForm.termsAndConditions}
                  onChange={(e) => updateQuoteField('termsAndConditions', e.target.value)}
                  className="rounded-xl min-h-[100px]"
                />
                <Label className="text-primary font-bold">Cancellation Policy</Label>
                <Textarea
                  value={quoteForm.cancellationPolicy}
                  onChange={(e) => updateQuoteField('cancellationPolicy', e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              {/* Totals */}
              <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>Rs. {quoteForm.subtotal?.toLocaleString()}</span>
                </div>
                {quoteForm.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Discount</span>
                    <span>- Rs. {quoteForm.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-headline font-bold pt-2 border-t border-primary/20">
                  <span>Total</span>
                  <span className="text-primary">Rs. {quoteForm.total?.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowQuoteBuilder(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  disabled={processingId === selectedBooking.id}
                  className="flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold h-12"
                >
                  {processingId === selectedBooking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Save & Send Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SUCCESS MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-[2rem] border-green-500/30">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-3xl font-headline font-bold">Quote Sent! 🎉</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Ab client ko WhatsApp pe link bhejein
                </p>
              </div>

              <div className="p-4 rounded-xl bg-background/60 border border-border/40 text-left">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Quote Link
                </p>
                <p className="text-xs font-mono truncate">{generatedQuoteLink}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleShareOnWhatsApp}
                  className="w-full h-14 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send via WhatsApp
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full h-12 rounded-xl gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setShowSuccessModal(false);
                  setGeneratedQuoteLink('');
                }}
                className="text-muted-foreground"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INVOICE EDITOR MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showInvoiceEditor && selectedBooking && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl rounded-[2rem] my-8 border-primary/30">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-headline font-bold text-2xl">Invoice Editor</h2>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowInvoiceEditor(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Package Name</Label>
                <Input
                  value={invoiceEdit.packageName || ''}
                  onChange={(e) => setInvoiceEdit(prev => ({ ...prev, packageName: e.target.value }))}
                  className="h-11 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Package Price</Label>
                    <Input
                      type="number"
                      value={invoiceEdit.packagePrice || 0}
                      onChange={(e) => setInvoiceEdit(prev => ({ ...prev, packagePrice: Number(e.target.value) }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Advance</Label>
                    <Input
                      type="number"
                      value={invoiceEdit.advanceAmount || 0}
                      onChange={(e) => setInvoiceEdit(prev => ({ ...prev, advanceAmount: Number(e.target.value) }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <Label>Notes</Label>
                <Textarea
                  value={invoiceEdit.notes || ''}
                  onChange={(e) => setInvoiceEdit(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowInvoiceEditor(false)} variant="outline" className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowInvoiceEditor(false);
                  }}
                  className="flex-1 rounded-xl bg-primary gap-2 font-bold"
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOOKING CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

function BookingCard({
  booking,
  processing,
  onCreateQuote,
  onMarkAdvance,
  onMarkPayment,
  onCancel,
  onDelete,
  onEditInvoice,
  onDownloadPDF,
}: {
  booking: Booking;
  processing: boolean;
  onCreateQuote: () => void;
  onMarkAdvance: () => void;
  onMarkPayment: (idx: number) => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditInvoice: () => void;
  onDownloadPDF: () => void;
}) {
  const statusColors = {
    pending: 'border-primary/30 bg-primary/[0.03]',
    quote_sent: 'border-blue-500/30 bg-blue-500/[0.03]',
    quote_accepted: 'border-green-500/30 bg-green-500/[0.03]',
    invoice_sent: 'border-green-500/30 bg-green-500/[0.03]',
    advance_paid: 'border-green-500/40 bg-green-500/[0.05]',
    completed: 'border-blue-500/30 bg-blue-500/[0.03]',
    auto_cancelled: 'border-destructive/30 opacity-70',
    manually_cancelled: 'border-destructive/30 opacity-70',
    quote_rejected: 'border-destructive/30 opacity-70',
    quote_changes_requested: 'border-amber-500/30',
  };

  const statusColor = statusColors[booking.status as keyof typeof statusColors] || '';

  return (
    <Card className={cn("rounded-2xl border bg-card/80 overflow-hidden", statusColor)}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-xl font-headline font-bold">{booking.clientName}</h3>
                <p className="text-sm text-muted-foreground">
                  {booking.eventType} · {booking.city || 'City N/A'}
                </p>
              </div>
              <Badge className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                booking.status === 'pending' && "bg-primary/20 text-primary border-primary/30",
                (booking.status === 'quote_accepted' || booking.status === 'invoice_sent') && "bg-green-500/20 text-green-500 border-green-500/30",
                booking.status === 'advance_paid' && "bg-green-500/30 text-green-500 border-green-500/40",
                booking.status === 'completed' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                booking.status === 'quote_sent' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                (booking.status === 'auto_cancelled' || booking.status === 'manually_cancelled' || booking.status === 'quote_rejected') && "bg-destructive/20 text-destructive border-destructive/30"
              )}>
                {booking.status.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{booking.eventDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${booking.clientPhone}`} className="hover:text-primary">{booking.clientPhone}</a>
              </div>
              {booking.clientEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <a href={`mailto:${booking.clientEmail}`} className="hover:text-primary truncate">{booking.clientEmail}</a>
                </div>
              )}
              {booking.budget && (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary shrink-0" />
                  <span>Budget: {booking.budget}</span>
                </div>
              )}
            </div>

            {booking.message && (
              <div className="p-3 rounded-xl bg-background/40 border border-border/30">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm italic">{booking.message}</p>
                </div>
              </div>
            )}

            {booking.quote && (
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold">Quote #{booking.quote.quoteNumber}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Rs. {booking.quote.total?.toLocaleString()}
                  </Badge>
                </div>
                {booking.advanceDeadline && booking.status === 'invoice_sent' && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <Clock className="w-3 h-3" />
                    <span>Advance deadline: {new Date(booking.advanceDeadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            {booking.invoice && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Invoice #{booking.invoice.invoiceNumber}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{booking.invoice.status}</Badge>
                </div>

                <div className="space-y-2">
                  {(booking.invoice.paymentSchedule || []).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {p.status === 'paid' ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={cn(p.status === 'paid' && "line-through opacity-50")}>{p.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Rs. {p.amount?.toLocaleString()}</span>
                        {p.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMarkPayment(idx)}
                            disabled={processing}
                            className="h-6 px-2 text-[9px] rounded-md"
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {booking.clientApproval?.signature && (
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                      Signed by: {booking.clientApproval.typedName}
                    </p>
                    <img
                      src={booking.clientApproval.signature}
                      alt="Signature"
                      className="h-12 object-contain bg-white rounded-md p-1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="lg:w-52 flex flex-col gap-2 lg:border-l lg:border-border/30 lg:pl-6">

            {/* 🆕 MANAGE BOOKING — SIRF subdomain wale ko */}
            {booking.photographerSubdomain && (
              <Link href={`/dashboard/bookings/${booking.id}`}>
                <Button
                  variant="default"
                  className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold h-10"
                >
                  <Edit3 className="w-4 h-4" />
                  Manage Booking
                </Button>
              </Link>
            )}

            {booking.status === 'pending' && (
              <Button
                onClick={onCreateQuote}
                disabled={processing}
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold h-10"
              >
                <Sparkles className="w-4 h-4" />
                Create Quote
              </Button>
            )}

            {booking.status === 'quote_sent' && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Waiting for client</p>
              </div>
            )}

            {(booking.status === 'quote_accepted' || booking.status === 'invoice_sent') && (
              <Button
                onClick={onMarkAdvance}
                disabled={processing}
                className="rounded-xl gap-2 bg-green-500 hover:bg-green-600 text-white font-bold h-10"
              >
                <Check className="w-4 h-4" />
                Mark Advance Paid
              </Button>
            )}

            {booking.invoice && (
              <Button
                onClick={onDownloadPDF}
                variant="outline"
                className="rounded-xl gap-2 border-primary/30 font-bold h-10"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
            )}

            {(booking.status === 'pending' || booking.status === 'quote_sent') && (
              <Button
                onClick={onCancel}
                disabled={processing}
                variant="outline"
                className="rounded-xl gap-2 border-destructive/30 text-destructive h-10 font-bold"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            )}

            <Button
              onClick={onDelete}
              disabled={processing}
              variant="ghost"
              className="rounded-xl gap-2 text-muted-foreground hover:text-destructive h-10"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}