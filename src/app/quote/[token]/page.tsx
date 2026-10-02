"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Check, X, Send, Loader2, AlertCircle,
  Calendar, User, Phone, Mail, Crown, Sparkles,
  Award, Download, MessageCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HafashLoader } from "@/components/ui/hafash-loader";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useToast } from "@/hooks/use-toast";
import {
  getQuoteByToken,
  acceptQuote,
  rejectQuote,
  requestQuoteChanges,
} from "@/app/actions/quotes";
import { cn } from "@/lib/utils";

type PageState = "loading" | "view" | "sign" | "reject" | "changes" | "accepted" | "error";

export default function ClientQuotePage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const { toast } = useToast();

  const [state, setState] = useState<PageState>("loading");
  const [booking, setBooking] = useState<any>(null);
  const [photographer, setPhotographer] = useState<any>(null);

  // Signature state
  const [typedName, setTypedName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Reject state
  const [rejectReason, setRejectReason] = useState("");

  // Changes state
  const [changesMessage, setChangesMessage] = useState("");

  // Invoice number after accept
  const [invoiceNumber, setInvoiceNumber] = useState("");

  useEffect(() => {
    async function load() {
      if (!token) {
        setState("error");
        return;
      }

      try {
        const result = await getQuoteByToken(token);

        if (!result.success || !result.booking) {
          setState("error");
          return;
        }

        setBooking(result.booking);
        setPhotographer(result.photographer);

        // Check current status
        const status = result.booking.status;
        if (status === "quote_accepted" || status === "invoice_sent" || status === "advance_paid") {
          setState("accepted");
          setInvoiceNumber(result.booking.invoice?.invoiceNumber || "");
        } else if (status === "quote_rejected") {
          setState("error");
        } else if (status === "quote_sent") {
          setState("view");
        } else {
          setState("view");
        }
      } catch (err) {
        setState("error");
      }
    }

    load();
  }, [token]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleAcceptClick = () => {
    setState("sign");
  };

  const handleSignatureSave = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleConfirmAccept = async () => {
    if (!typedName.trim()) {
      toast({ variant: "destructive", title: "Naam likhein" });
      return;
    }
    if (!signature) {
      toast({ variant: "destructive", title: "Signature karein" });
      return;
    }
    if (!agreedToTerms) {
      toast({ variant: "destructive", title: "Terms accept karein" });
      return;
    }

    setIsSubmitting(true);
    try {
      const deviceInfo = typeof navigator !== "undefined"
        ? `${navigator.platform || ""} - ${navigator.userAgent.slice(0, 100)}`
        : "";

      const result = await acceptQuote(booking.id, {
        signature,
        typedName: typedName.trim(),
        agreedToTerms,
        deviceInfo,
      });

      if (!result.success) throw new Error(result.error);

      setInvoiceNumber(result.invoiceNumber || "");
      setState("accepted");

      toast({
        title: "✅ Quote Accepted!",
        description: `Invoice ${result.invoiceNumber} generate ho gaya`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Accept nahi ho saka",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      toast({ variant: "destructive", title: "Reason likhein" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await rejectQuote(booking.id, rejectReason.trim());
      if (!result.success) throw new Error(result.error);

      toast({ title: "Quote reject kar diya" });
      setState("error");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmChanges = async () => {
    if (!changesMessage.trim()) {
      toast({ variant: "destructive", title: "Message likhein" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestQuoteChanges(booking.id, changesMessage.trim());
      if (!result.success) throw new Error(result.error);

      toast({ title: "Changes request bhej di" });
      setState("accepted"); // Show success-ish state
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════════════════════════════

  if (state === "loading") {
    return <HafashLoader text="Quote load ho raha hai..." />;
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <AlertCircle className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold">Quote Not Available</h2>
            <p className="text-sm text-muted-foreground">
              Yeh quote available nahi hai ya already process ho chuka hai.
            </p>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">
                Go to Hafash
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking || !booking.quote) {
    return null;
  }

  const quote = booking.quote;
  const studioName = photographer?.studioName || "Professional Studio";
  const logo = photographer?.studioLogo;
  const whatsapp = photographer?.whatsappNumber;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={studioName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {studioName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-headline font-bold">{studioName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Quote {quote.quoteNumber}
              </p>
            </div>
          </div>

          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="rounded-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Contact
              </Button>
            </a>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ACCEPTED STATE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {state === "accepted" && (
          <Card className="rounded-[2rem] border-green-500/30 bg-green-500/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 via-green-400 to-transparent" />
            <CardContent className="p-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-headline font-bold">Shukriya! 🎉</h2>
                <p className="text-muted-foreground">
                  Aapne quote accept kar liya. Photographer jald contact karega.
                </p>
              </div>

              {invoiceNumber && (
                <div className="p-6 rounded-2xl bg-background/60 border border-border/40 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Invoice Number
                  </p>
                  <p className="text-2xl font-headline font-bold text-primary">
                    #{invoiceNumber}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Invoice aapki WhatsApp pe bheja jayega
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                    Agla Step
                  </p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Photographer aapko advance payment ke liye contact karega. Advance milne ke baad booking confirm hogi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VIEW / SIGN / REJECT / CHANGES */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {state !== "accepted" && (
          <>
            {/* Client Info */}
            <Card className="rounded-[2rem] border-border/40">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                      Quote For
                    </p>
                    <h1 className="text-2xl lg:text-3xl font-headline font-bold mt-1">
                      {booking.clientName}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {booking.eventType} · {booking.eventDate}
                    </p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-widest">
                    {quote.quoteNumber}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Package */}
            <Card className="rounded-[2rem] border-border/40">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <h2 className="font-headline font-bold text-lg">Package</h2>
                </div>
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="font-headline font-bold text-xl">{quote.packageName}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {quote.packageDescription}
                      </p>
                    </div>
                    <p className="text-2xl font-headline font-bold text-primary whitespace-nowrap">
                      Rs. {quote.packagePrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extra Services */}
            {quote.extras && quote.extras.length > 0 && (
              <Card className="rounded-[2rem] border-border/40">
                <CardContent className="p-6 lg:p-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-headline font-bold text-lg">Extra Services</h2>
                  </div>
                  <div className="space-y-3">
                    {quote.extras.map((extra: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start gap-4 p-4 rounded-xl bg-background/40 border border-border/30">
                        <div>
                          <p className="font-bold text-sm">{extra.name}</p>
                          {extra.description && (
                            <p className="text-xs text-muted-foreground mt-1">{extra.description}</p>
                          )}
                        </div>
                        <p className="font-bold text-primary whitespace-nowrap">
                          Rs. {extra.price.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Schedule */}
            <Card className="rounded-[2rem] border-border/40">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="font-headline font-bold text-lg">Payment Schedule</h2>
                </div>
                <div className="space-y-3">
                  {(quote.paymentSchedule || []).map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex justify-between items-center gap-4 p-4 rounded-xl border",
                        idx === 0
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background/40 border-border/30"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <p className="font-bold text-sm">{p.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-8">
                          {p.percentage}% · {p.dueDate || `${p.dueDaysAfterAccept || 3} din`}
                        </p>
                      </div>
                      <p className="font-bold text-primary whitespace-nowrap">
                        Rs. {p.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deliverables */}
            {quote.deliverables && quote.deliverables.length > 0 && (
              <Card className="rounded-[2rem] border-border/40">
                <CardContent className="p-6 lg:p-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h2 className="font-headline font-bold text-lg">Deliverables</h2>
                  </div>
                  <div className="space-y-3">
                    {quote.deliverables.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start gap-4 p-4 rounded-xl bg-background/40 border border-border/30">
                        <div>
                          <p className="font-bold text-sm">{d.name}</p>
                          {d.description && (
                            <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                          )}
                        </div>
                        <p className="font-bold whitespace-nowrap text-primary">
                          {d.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">
                      Data Delivery
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Date:</span> {quote.dataDeliveryDate}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Method:</span> {quote.dataDeliveryMethod}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total */}
            <Card className="rounded-[2rem] border-primary/30 bg-gradient-to-br from-primary/10 to-background">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rs. {quote.subtotal.toLocaleString()}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-500">- Rs. {quote.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>Rs. {quote.tax.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-primary/20 flex justify-between items-baseline">
                  <span className="font-headline font-bold text-lg">Total</span>
                  <span className="font-headline font-bold text-3xl text-primary">
                    Rs. {quote.total.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card className="rounded-[2rem] border-border/40">
              <CardContent className="p-6 lg:p-8 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="font-headline font-bold text-lg">Terms & Conditions</h2>
                  {showTerms ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {showTerms && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Terms
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {quote.termsAndConditions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Cancellation Policy
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {quote.cancellationPolicy}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SIGN STATE */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {state === "sign" && (
              <Card className="rounded-[2rem] border-primary/30 bg-primary/5">
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-headline font-bold">
                      Signature Karein
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Confirm karne ke liye apna naam likhein aur signature karein
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Poora Naam *</Label>
                    <Input
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Ahmed Khan"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Signature *</Label>
                    <SignatureCanvas
                      onSave={handleSignatureSave}
                    />
                    {signature && (
                      <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <p className="text-xs text-green-500 font-bold">
                          Signature saved
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-background/40 border border-border/30">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-primary"
                    />
                    <label htmlFor="agree-terms" className="text-xs leading-relaxed cursor-pointer">
                      Main <strong>terms & conditions</strong> aur <strong>cancellation policy</strong> se agree karta hoon. Yeh quote mera final approval hai.
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setState("view")}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleConfirmAccept}
                      disabled={isSubmitting || !signature || !typedName.trim() || !agreedToTerms}
                      className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 font-bold gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Accept & Sign Quote
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* REJECT STATE */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {state === "reject" && (
              <Card className="rounded-[2rem] border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <X className="w-12 h-12 text-destructive mx-auto" />
                    <h2 className="text-2xl font-headline font-bold">
                      Quote Reject
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Kya aap sure hain? Reason likhein.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Kyun reject kar rahe hain?"
                      className="rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setState("view")}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleConfirmReject}
                      disabled={isSubmitting || !rejectReason.trim()}
                      variant="destructive"
                      className="flex-1 rounded-xl h-12 font-bold gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Confirm Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* CHANGES STATE */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {state === "changes" && (
              <Card className="rounded-[2rem] border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <MessageCircle className="w-12 h-12 text-amber-500 mx-auto" />
                    <h2 className="text-2xl font-headline font-bold">
                      Request Changes
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Bataein kya change karna hai?
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={changesMessage}
                      onChange={(e) => setChangesMessage(e.target.value)}
                      placeholder="Jaise: Package price thora kam karein, ya extra drone add karein..."
                      className="rounded-xl min-h-[120px]"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setState("view")}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleConfirmChanges}
                      disabled={isSubmitting || !changesMessage.trim()}
                      className="flex-1 rounded-xl h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MAIN ACTION BUTTONS (View State) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {state === "view" && (
              <Card className="rounded-[2rem] border-primary/30 bg-gradient-to-br from-primary/10 to-background sticky bottom-6">
                <CardContent className="p-6 space-y-3">
                  <Button
                    onClick={handleAcceptClick}
                    className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Accept Quote
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setState("changes")}
                      className="rounded-xl h-12 gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Request Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setState("reject")}
                      className="rounded-xl h-12 gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}