"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, deleteDoc 
} from "firebase/firestore";
import {
  Calendar, User, Mail, Phone, MapPin, MessageSquare,
  CheckCircle2, XCircle, Clock, Loader2, ArrowLeft,
  FileText, Trash2, Check, X, Crown, AlertTriangle,
  Download, Edit3, Save, Send
} from "lucide-react";
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
import type { Booking, Invoice } from "@/lib/portfolio-types";

type FilterTab = 'all' | 'pending' | 'accepted' | 'completed' | 'rejected';

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);

  // Invoice editor state
  const [invoiceEdit, setInvoiceEdit] = useState<Partial<Invoice>>({});

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

      // Sort by createdAt descending
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
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    accepted: bookings.filter(b => b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
  }), [bookings]);

  const handleAccept = async (booking: Booking) => {
    if (!booking.id) return;

    // Default package
    const pkgName = booking.packageSelected || 'Custom Package';
    const pkgPrice = 50000;
    const advancePercent = 30;

    if (!confirm(`Accept booking? Invoice auto-generate hoga.\n\nPackage: ${pkgName}\nPrice: Rs. ${pkgPrice.toLocaleString()}\nAdvance (${advancePercent}%): Rs. ${Math.round(pkgPrice * advancePercent / 100).toLocaleString()}`)) return;

    setProcessingId(booking.id);
    try {
      const result = await acceptBooking(booking.id, pkgName, pkgPrice, advancePercent);
      if (!result.success) throw new Error(result.error);

      toast({
        title: '✅ Booking Accepted',
        description: `Invoice ${result.invoiceNumber} generate ho gaya`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (booking: Booking) => {
    if (!booking.id) return;
    const reason = prompt('Rejection reason (optional):') || '';
    if (reason === null) return;

    setProcessingId(booking.id);
    try {
      const result = await rejectBooking(booking.id, reason);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Booking rejected' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message,
      });
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
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (booking: Booking) => {
    if (!booking.id) return;
    if (!confirm('Mark as completed?')) return;

    setProcessingId(booking.id);
    try {
      const result = await markBookingCompleted(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({ title: '✅ Marked completed' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openInvoiceEditor = (booking: Booking) => {
    setSelectedBooking(booking);
    setInvoiceEdit(booking.invoice || {});
    setShowInvoiceEditor(true);
  };

  const handleSaveInvoice = async () => {
    if (!selectedBooking?.id) return;

    setProcessingId(selectedBooking.id);
    try {
      const result = await updateInvoice(selectedBooking.id, invoiceEdit);
      if (!result.success) throw new Error(result.error);
      toast({ title: '✅ Invoice updated' });
      setShowInvoiceEditor(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedBooking?.invoice) return;
    window.print();
  };

  if (authLoading || loading) {
    return <HafashLoader text="Loading bookings..." />;
  }

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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mb-2">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Bookings
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              Booking Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Client bookings manage karein — accept, reject, invoice
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'accepted', label: 'Accepted', count: counts.accepted },
            { key: 'completed', label: 'Completed', count: counts.completed },
            { key: 'rejected', label: 'Rejected', count: counts.rejected },
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
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl">
                  {filter === 'all' ? 'Koi booking nahi' : `Koi ${filter} booking nahi`}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Jab koi client aapke subdomain portfolio se booking karega, toh yahan dikhega.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <Card
                key={booking.id}
                className={cn(
                  "rounded-2xl border bg-card/80 overflow-hidden transition-all",
                  booking.status === 'pending' && "border-primary/30 bg-primary/[0.03]",
                  booking.status === 'accepted' && "border-green-500/30",
                  booking.status === 'completed' && "border-blue-500/30",
                  booking.status === 'rejected' && "border-destructive/30 opacity-70"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left — Client Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-xl font-headline font-bold">
                            {booking.clientName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.eventType} · {booking.city || 'City N/A'}
                          </p>
                        </div>
                        <Badge className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          booking.status === 'pending' && "bg-primary/20 text-primary border-primary/30",
                          booking.status === 'accepted' && "bg-green-500/20 text-green-500 border-green-500/30",
                          booking.status === 'completed' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                          booking.status === 'rejected' && "bg-destructive/20 text-destructive border-destructive/30"
                        )}>
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span>{booking.eventDate || 'Date N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <a href={`tel:${booking.clientPhone}`} className="hover:text-primary">
                            {booking.clientPhone}
                          </a>
                        </div>
                        {booking.clientEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary shrink-0" />
                            <a href={`mailto:${booking.clientEmail}`} className="hover:text-primary truncate">
                              {booking.clientEmail}
                            </a>
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

                      {booking.packageSelected && (
                        <div className="flex items-center gap-2 text-sm">
                          <Crown className="w-4 h-4 text-primary" />
                          <span className="font-bold">Package: {booking.packageSelected}</span>
                        </div>
                      )}

                      {/* Invoice Info */}
                      {booking.invoice && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm font-bold">
                                Invoice #{booking.invoice.invoiceNumber}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {booking.invoice.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs pt-2">
                            <div>
                              <p className="text-muted-foreground">Total</p>
                              <p className="font-bold">Rs. {booking.invoice.packagePrice?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Advance</p>
                              <p className="font-bold text-primary">Rs. {booking.invoice.advanceAmount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Balance</p>
                              <p className="font-bold">Rs. {booking.invoice.balanceAmount?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right — Actions */}
                    <div className="lg:w-48 flex flex-col gap-2 lg:border-l lg:border-border/30 lg:pl-6">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleAccept(booking)}
                            disabled={processingId === booking.id}
                            className="rounded-xl gap-2 bg-green-500 hover:bg-green-600 text-white font-bold h-10"
                          >
                            {processingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Accept + Invoice
                          </Button>
                          <Button
                            onClick={() => handleReject(booking)}
                            disabled={processingId === booking.id}
                            variant="outline"
                            className="rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 font-bold h-10"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {booking.invoice && (
                        <Button
                          onClick={() => openInvoiceEditor(booking)}
                          variant="outline"
                          className="rounded-xl gap-2 border-primary/30 hover:bg-primary/5 font-bold h-10"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Invoice
                        </Button>
                      )}

                      {booking.status === 'accepted' && (
                        <Button
                          onClick={() => handleMarkCompleted(booking)}
                          disabled={processingId === booking.id}
                          className="rounded-xl gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold h-10"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Completed
                        </Button>
                      )}

                      <Button
                        onClick={() => handleDelete(booking)}
                        disabled={processingId === booking.id}
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
            ))}
          </div>
        )}
      </div>

      {/* Invoice Editor Modal */}
      {showInvoiceEditor && selectedBooking && (
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowInvoiceEditor(false)}
        >
          <Card
            className="w-full max-w-2xl rounded-[2rem] my-8 border-primary/30"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-2xl">Invoice Editor</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.invoice?.invoiceNumber}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowInvoiceEditor(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Invoice Preview / Editable */}
              <div className="space-y-5 p-6 rounded-2xl bg-background/40 border border-border/30">
                <div className="text-center pb-4 border-b border-border/30">
                  <h3 className="text-2xl font-headline font-bold">INVOICE</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    #{invoiceEdit.invoiceNumber || selectedBooking.invoice?.invoiceNumber}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest">Issue Date</p>
                    <p className="font-bold mt-1">
                      {new Date(invoiceEdit.issueDate || selectedBooking.invoice?.issueDate || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest">Due Date</p>
                    <p className="font-bold mt-1">
                      {new Date(invoiceEdit.dueDate || selectedBooking.invoice?.dueDate || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/30">
                  <div className="space-y-2">
                    <Label>Package Name</Label>
                    <Input
                      value={invoiceEdit.packageName || ''}
                      onChange={(e) => setInvoiceEdit(prev => ({ ...prev, packageName: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Package Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={invoiceEdit.packagePrice || 0}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        const advancePct = invoiceEdit.packagePrice 
                          ? (invoiceEdit.advanceAmount || 0) / invoiceEdit.packagePrice * 100 
                          : 30;
                        const advance = Math.round(price * advancePct / 100);
                        setInvoiceEdit(prev => ({
                          ...prev,
                          packagePrice: price,
                          advanceAmount: advance,
                          balanceAmount: price - advance,
                        }));
                      }}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Advance (Rs.)</Label>
                      <Input
                        type="number"
                        value={invoiceEdit.advanceAmount || 0}
                        onChange={(e) => {
                          const advance = Number(e.target.value);
                          const price = invoiceEdit.packagePrice || 0;
                          setInvoiceEdit(prev => ({
                            ...prev,
                            advanceAmount: advance,
                            balanceAmount: price - advance,
                          }));
                        }}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Balance (Rs.)</Label>
                      <Input
                        type="number"
                        value={invoiceEdit.balanceAmount || 0}
                        readOnly
                        className="h-11 rounded-xl bg-muted/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={invoiceEdit.notes || ''}
                      onChange={(e) => setInvoiceEdit(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes for client..."
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveInvoice}
                  disabled={processingId === selectedBooking.id}
                  className="flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 font-bold h-12"
                >
                  {processingId === selectedBooking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Invoice
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2 border-primary/30 font-bold h-12"
                  onClick={() => {
                    const phone = selectedBooking.clientPhone.replace(/\D/g, '');
                    const invoice = selectedBooking.invoice;
                    if (!invoice) return;
                    const msg = `Salam ${selectedBooking.clientName},\n\nAapki booking confirm ho gayi.\n\n*Invoice ${invoice.invoiceNumber}*\nPackage: ${invoice.packageName}\nTotal: Rs. ${invoice.packagePrice?.toLocaleString()}\nAdvance: Rs. ${invoice.advanceAmount?.toLocaleString()}\nBalance: Rs. ${invoice.balanceAmount?.toLocaleString()}\n\nShukriya!`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}