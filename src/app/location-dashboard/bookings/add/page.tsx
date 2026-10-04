"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, addDoc, collection, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  CalendarDays,
  Clock,
  Sparkles,
  Wallet,
  Loader2,
  Check,
  Info,
  Send,
} from "lucide-react";
import { formatTime12h } from "@/lib/locations";
import {
  getSlotsForDate,
  getLocalDateKey,
  DEFAULT_SLOT_CONFIG,
  incrementSlotBooking,
  SHOOT_TYPES,
  type Slot,
} from "@/lib/slots";

export default function AddBookingPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  // Owner's location
  const locationRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "shootLocations", user.uid);
  }, [firestore, user?.uid]);
  const { data: location, loading: loadingLocation } = useDoc(locationRef);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [shootType, setShootType] = useState("couple");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [message, setMessage] = useState("");
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");

  const bookingConfig = useMemo(() => {
    return location?.bookingConfig || DEFAULT_SLOT_CONFIG;
  }, [location?.bookingConfig]);

  const dateKey = eventDate || "";

  const availableSlots: Slot[] = useMemo(() => {
    if (!location || !dateKey) return [];
    return getSlotsForDate(
      bookingConfig,
      location.openTime || "09:00",
      location.closeTime || "21:00",
      dateKey,
      location.slotAvailability || {}
    );
  }, [location, bookingConfig, dateKey]);

  const handleSave = async () => {
    if (!firestore || !user || !location) return;

    // Validations
    if (!clientName.trim()) {
      toast({ variant: "destructive", title: "Client name required" });
      return;
    }
    if (!clientPhone.trim() || !/^03\d{9}$/.test(clientPhone.replace(/\s+/g, ""))) {
      toast({ variant: "destructive", title: "Valid phone number required (03001234567)" });
      return;
    }
    if (!dateKey) {
      toast({ variant: "destructive", title: "Date required" });
      return;
    }
    if (!selectedSlot) {
      toast({ variant: "destructive", title: "Slot select karein" });
      return;
    }
    if (selectedSlot.isFull) {
      toast({ variant: "destructive", title: "Yeh slot full hai" });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const hours = bookingConfig.slotDuration || 2;
      const totalAmount = hours * (location.hourlyRate || 0);
      const advance = Number(advanceAmount) || 0;
      const balance = Math.max(0, totalAmount - advance);

      // ═══ Booking record ═══
      const bookingData = {
        ownerId: user.uid,
        locationId: location.id || user.uid,
        locationName: location.name,
        locationCity: location.city,

        clientId: "",
        clientName: clientName.trim(),
        clientPhone: clientPhone.replace(/\s+/g, ""),
        clientEmail: clientEmail.trim(),

        date: dateKey,
        time: selectedSlot.label,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        hours,
        hourlyRate: location.hourlyRate || 0,
        totalAmount,

        shootType,
        message: message.trim(),

        status: "confirmed",  // Manual entry → already confirmed
        source: "whatsapp-manual",  // ⭐ Mark source

        // Invoice
        invoice: {
          invoiceNumber: `INV-LOC-${new Date().getFullYear()}-${String((location.invoiceCounter || 0) + 1).padStart(3, "0")}`,
          issueDate: now,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          packageName: location.name,
          packagePrice: totalAmount,
          advanceAmount: advance,
          balanceAmount: balance,
          notes: "",
          status: "sent",
          paymentDetails: location.paymentDetails || {},
        },

        advanceReceived: advance > 0,
        advanceReceivedAt: advance > 0 ? now : null,
        paymentScreenshotUrl: paymentScreenshotUrl.trim(),

        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(firestore, "locationBookings"), bookingData);

      // ═══ Update slot availability ═══
      const currentAvailability = location.slotAvailability || {};
      const updatedAvailability = incrementSlotBooking(
        dateKey,
        selectedSlot.start,
        selectedSlot.end,
        currentAvailability,
        bookingConfig.capacityPerSlot
      );

      await updateDoc(doc(firestore, "shootLocations", user.uid), {
        slotAvailability: updatedAvailability,
        invoiceCounter: increment(1),
        updatedAt: now,
      });

      toast({
        title: "✅ Booking added!",
        description: `${clientName} ka booking ${dateKey} ${selectedSlot.label} pe record ho gaya.`,
      });

      router.push("/location-dashboard/bookings");
    } catch (err: any) {
      console.error("[ADD_BOOKING] Error:", err);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <Info className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold">Location nahi mili</h2>
            <p className="text-sm text-muted-foreground">
              Pehle apni location list karein.
            </p>
            <Link href="/locations/join">
              <Button className="rounded-xl">Add Location</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Manual Entry
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-headline font-bold tracking-tight">
              Add Booking
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              WhatsApp pe booking hone ke baad yahan record karein.
            </p>
          </div>
        </div>

        {/* Booking Form */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* Client Name */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Client Name *
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ahmed Khan"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  WhatsApp *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="03001234567"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" /> Event Date *
              </Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Slot Selection */}
            {eventDate && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Time Slot *
                </Label>

                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-3">
                    Is date ke liye koi slot nahi.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        disabled={slot.isFull}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all",
                          slot.isFull
                            ? "border-red-500/20 bg-red-500/5 opacity-50 cursor-not-allowed"
                            : selectedSlot?.start === slot.start
                              ? "border-primary bg-primary/10"
                              : "border-border/30 hover:border-primary/50"
                        )}
                      >
                        <p className="text-sm font-bold">{slot.label}</p>
                        <p className="text-[10px] mt-0.5 text-muted-foreground">
                          {slot.isFull
                            ? "❌ Full"
                            : `✅ ${slot.available}/${slot.capacity} available`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shoot Type */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Shoot Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {SHOOT_TYPES.filter((t) => bookingConfig.shootTypes?.includes(t.id)).map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setShootType(type.id)}
                    className={cn(
                      "px-3 py-2 rounded-xl border-2 transition-all text-xs font-bold flex items-center gap-1.5",
                      shootType === type.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span>{type.emoji}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advance Amount */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3 h-3" /> Advance Received (Rs.)
              </Label>
              <Input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="4500"
                className="h-12 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Agar advance aa gaya hai to amount likhein. Warna khaali chhorein.
              </p>
            </div>

            {/* Screenshot URL */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Payment Screenshot URL (optional)
              </Label>
              <Input
                value={paymentScreenshotUrl}
                onChange={(e) => setPaymentScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="h-12 rounded-xl"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Koi khaas baat..."
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>

            {/* Amount Preview */}
            {selectedSlot && location.hourlyRate && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span className="font-bold">Rs. {location.hourlyRate.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-bold">{bookingConfig.slotDuration} hours</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-bold text-lg text-primary">
                    Rs. {((bookingConfig.slotDuration || 2) * location.hourlyRate).toLocaleString()}
                  </span>
                </div>
                {Number(advanceAmount) > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                    <span className="font-bold text-sm">Balance</span>
                    <span className="font-bold text-sm">
                      Rs. {Math.max(0, (bookingConfig.slotDuration || 2) * location.hourlyRate - Number(advanceAmount)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSave}
              disabled={saving || !selectedSlot || selectedSlot.isFull}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Booking
                </>
              )}
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}