"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Users,
  DollarSign,
  Heart,
  Share2,
  MessageSquare,
  Wallet,
  Copy,
  Check,
  Info,
  Camera,
  Sparkles,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Instagram,
  Phone,
  AlertCircle,
  CheckCircle2,
  Building2,
  Navigation,
  Loader2,
  Eye,
} from "lucide-react";
import {
  getCategoryInfo,
  AMENITIES,
  formatTime12h,
  getSlotsForDate,
  isTimeSlotBooked,
  OPENING_HOURS,
  type PaymentDetails,
} from "@/lib/locations";
import { format } from "date-fns";

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const locationId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const locationRef = useMemo(() => {
    if (!firestore || !locationId) return null;
    return doc(firestore, "shootLocations", locationId);
  }, [firestore, locationId]);

  const { data: location, loading } = useDoc(locationRef);

  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isOwnLocation = useMemo(() => {
    if (!user || !location) return false;
    return user.uid === location.ownerId;
  }, [user, location]);

  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const bookedSlots = useMemo(() => {
    if (!location?.bookedSlots) return [];
    return getSlotsForDate(location.bookedSlots, dateKey);
  }, [location?.bookedSlots, dateKey]);

  // Generate all possible slots from open to close
  const availableSlots = useMemo(() => {
    if (!location) return [];
    const openIdx = OPENING_HOURS.indexOf(location.openTime);
    const closeIdx = OPENING_HOURS.indexOf(location.closeTime);
    if (openIdx === -1 || closeIdx === -1 || closeIdx <= openIdx) return [];

    const slots: { start: string; end: string; isBooked: boolean }[] = [];
    for (let i = openIdx; i < closeIdx; i++) {
      const start = OPENING_HOURS[i];
      const end = OPENING_HOURS[i + 1];
      const isBooked = isTimeSlotBooked(bookedSlots, start, end);
      slots.push({ start, end, isBooked });
    }
    return slots;
  }, [location, bookedSlots]);

  const categoryInfo = useMemo(() => {
    if (!location?.category) return null;
    return getCategoryInfo(location.category);
  }, [location?.category]);

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedField(null), 2000);
  }, [toast]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  }, [toast]);
    // Increment views counter (once per session per location)
    useEffect(() => {
      if (!firestore || !locationId || !location) return;
  
      const viewKey = `viewed_location_${locationId}`;
      const alreadyViewed = sessionStorage.getItem(viewKey);
  
      if (alreadyViewed === "true") return;
  
      // Don't count owner's own views
      if (user && location.ownerId === user.uid) return;
  
      const incrementView = async () => {
        try {
          const { updateDoc, increment, doc: firestoreDoc } = await import("firebase/firestore");
          await updateDoc(firestoreDoc(firestore, "shootLocations", locationId), {
            viewCount: increment(1),
          });
          sessionStorage.setItem(viewKey, "true");
        } catch (err) {
          // Silent fail
        }
      };
  
      incrementView();
    }, [firestore, locationId, location, user]);

  const handleOpenChat = () => {
    if (!user) {
      toast({ variant: "destructive", title: "Login required" });
      router.push("/login");
      return;
    }
    setShowChat(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading location...</p>
        </div>
      </div>
    );
  }

  if (!location || location.isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-10 text-center space-y-4">
            <AlertCircle className="w-14 h-14 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-headline font-bold">Location not found</h2>
            <p className="text-sm text-muted-foreground">
              Ye location ab available nahi hai ya remove kar di gayi hai.
            </p>
            <Link href="/locations">
              <Button variant="outline" className="rounded-xl">
                Browse Locations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const photos = location.photos || [];
  const amenities = location.amenities || [];
  const payment: PaymentDetails = location.paymentDetails || {};
  const rating = location.rating || { average: 0, count: 0 };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto p-5 lg:p-10 space-y-6">

        {/* Back */}
        <Button
          variant="ghost"
          className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* ═══ HERO ═══ */}
        <Card className="relative overflow-hidden rounded-[2.5rem] border-border/40 bg-card/60 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative p-7 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-7">
              <div className="space-y-4 flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Shoot Location
                  </span>
                </div>

                <div>
                  <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                    {location.name}
                  </h1>

                  {categoryInfo && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="rounded-lg bg-primary/10 text-primary border-primary/30 gap-1.5 px-3 py-1 text-xs font-bold">
                        <span>{categoryInfo.emoji}</span>
                        {categoryInfo.label}
                      </Badge>
                    </div>
                  )}
                </div>

                {rating.count > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-4 h-4",
                            s <= Math.round(rating.average)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold">{rating.average.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({rating.count} {rating.count === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {location.area ? `${location.area}, ` : ""}{location.city}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium text-xs">
                      {formatTime12h(location.openTime)} - {formatTime12h(location.closeTime)}
                    </span>
                  </div>
                  {location.viewCount > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="font-medium text-xs">
                        {location.viewCount.toLocaleString()} {location.viewCount === 1 ? "view" : "views"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-44">
                {!isOwnLocation && (
                  <Button
                    className="rounded-2xl h-12 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    onClick={handleOpenChat}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat with Owner
                  </Button>
                )}

                {isOwnLocation && (
                  <Link href="/locations/join">
                    <Button className="w-full rounded-2xl h-12 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Sparkles className="w-4 h-4" />
                      Edit Location
                    </Button>
                  </Link>
                )}

                <Button
                  variant="outline"
                  className="rounded-2xl h-12 font-bold gap-2 border-border/40 hover:bg-primary/5"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══ PHOTO GALLERY ═══ */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.slice(0, 8).map((p: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhotoIdx(idx)}
                className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden border border-border/40 hover:border-primary/50 transition-all group cursor-pointer",
                  idx === 0 && "col-span-2 row-span-2 md:col-span-2 md:row-span-2"
                )}
              >
                <img
                  src={p.url}
                  alt={p.name || `Photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* Description */}
            {location.description && (
              <SectionCard title="About" icon={<Info className="w-4 h-4" />}>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {location.description}
                </p>
              </SectionCard>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <SectionCard title="Facilities & Amenities" icon={<Sparkles className="w-4 h-4" />}>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((aId: string) => {
                    const a = AMENITIES.find((x) => x.id === aId);
                    if (!a) return null;
                    return (
                      <Badge
                        key={aId}
                        variant="outline"
                        className="rounded-xl bg-background/40 border-border/40 px-3 py-2 text-xs font-medium gap-1.5"
                      >
                        <span>{a.emoji}</span>
                        {a.label}
                      </Badge>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* ═══ AVAILABILITY ═══ */}
            <SectionCard title="Availability" icon={<CalendarDays className="w-4 h-4" />}>
              <div className="space-y-5">

                <div className="rounded-2xl border border-border/40 bg-background/30 p-2 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-xl"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Time slots for {format(selectedDate, "EEE, dd MMM yyyy")}
                    </p>

                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">
                        No slots available
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {availableSlots.map((slot, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 rounded-xl border-2 text-center transition-all",
                              slot.isBooked
                                ? "border-red-500/30 bg-red-500/5 text-red-400"
                                : "border-green-500/30 bg-green-500/5 text-green-400"
                            )}
                          >
                            <p className="text-[11px] font-bold">
                              {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest mt-1 font-bold">
                              {slot.isBooked ? "Booked" : "Available"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ═══ RULES / POLICIES ═══ */}
            <SectionCard title="Shooting Rules" icon={<AlertCircle className="w-4 h-4" />}>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Shooting hours: {formatTime12h(location.openTime)} - {formatTime12h(location.closeTime)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Minimum booking: {location.minHours || 2} hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Maximum guests: {location.maxPeople || 10} people</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Exact address booking confirm hone ke baad share hota hai</span>
                </li>
              </ul>
            </SectionCard>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* PRICING CARD */}
            <Card className="rounded-[2rem] border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-background shadow-xl overflow-hidden sticky top-6">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />

              <CardContent className="p-6 space-y-5">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-headline font-bold text-primary">
                    Rs. {location.hourlyRate?.toLocaleString()}
                  </p>
                  <span className="text-sm text-muted-foreground">/ hour</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Min booking</span>
                    <span className="font-bold">{location.minHours || 2} hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max people</span>
                    <span className="font-bold">{location.maxPeople || 10}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shooting hours</span>
                    <span className="font-bold text-[10px]">
                      {formatTime12h(location.openTime)} - {formatTime12h(location.closeTime)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/20 space-y-2">
                  {!isOwnLocation ? (
                    <>
                      <Button
                        className="w-full rounded-xl h-12 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleOpenChat}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat with Owner
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full rounded-xl h-12 font-bold gap-2 border-primary/30 hover:bg-primary/5"
                        onClick={() => setShowPayment(true)}
                      >
                        <Wallet className="w-4 h-4" />
                        View Payment Details
                      </Button>

                      {location.whatsappNumber && (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl h-12 font-bold gap-2 border-green-500/30 text-green-400 hover:bg-green-500/5"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${location.whatsappNumber.replace(/\D/g, "")}`,
                              "_blank"
                            )
                          }
                        >
                          <Phone className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      )}
                    </>
                  ) : (
                    <Link href="/locations/join">
                      <Button className="w-full rounded-xl h-12 font-bold gap-2 bg-primary text-primary-foreground">
                        <Sparkles className="w-4 h-4" />
                        Edit Location
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Payment directly owner ko hoti hai. Hafash paisa hold nahi karta.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* QUICK INFO */}
            <SectionCard title="Location Info" icon={<Navigation className="w-4 h-4" />}>
              <div className="space-y-3">
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="City" value={location.city} />
                {location.area && (
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="Area" value={location.area} />
                )}
                {location.googleMapsLink && (
                  <a
                    href={location.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      variant="outline"
                      className="w-full rounded-xl h-10 gap-2 text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </Button>
                  </a>
                )}
                {location.instagramLink && (
                  <a
                    href={location.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Instagram className="w-4 h-4 text-pink-400" />
                      Instagram
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {selectedPhotoIdx !== null && photos[selectedPhotoIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-3xl flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoIdx(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 z-30 text-white h-12 w-12 hover:bg-primary rounded-full"
            onClick={() => setSelectedPhotoIdx(null)}
          >
            <X className="w-6 h-6" />
          </Button>

          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl text-white text-xs font-bold">
            {selectedPhotoIdx + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-30 text-white h-14 w-14 hover:bg-primary rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIdx((p) =>
                    p === null ? 0 : p > 0 ? p - 1 : photos.length - 1
                  );
                }}
              >
                <ChevronLeft className="w-7 h-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-30 text-white h-14 w-14 hover:bg-primary rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIdx((p) =>
                    p === null ? 0 : p < photos.length - 1 ? p + 1 : 0
                  );
                }}
              >
                <ChevronRight className="w-7 h-7" />
              </Button>
            </>
          )}

          <img
            src={photos[selectedPhotoIdx].url}
            alt="Fullscreen"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ═══ PAYMENT DETAILS MODAL ═══ */}
      {showPayment && (
        <div
          className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setShowPayment(false)}
        >
          <Card
            className="w-full max-w-md rounded-[2rem] border-border/40 bg-card/95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-7 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-lg">Payment Details</h2>
                    <p className="text-xs text-muted-foreground">
                      Direct owner ko payment karein
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowPayment(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3">
                {payment.easypaisa && (
                  <PaymentRow
                    label="EasyPaisa"
                    value={payment.easypaisa}
                    copied={copiedField === "easypaisa"}
                    onCopy={() => handleCopy(payment.easypaisa!, "easypaisa")}
                    emoji="💚"
                  />
                )}
                {payment.jazzcash && (
                  <PaymentRow
                    label="JazzCash"
                    value={payment.jazzcash}
                    copied={copiedField === "jazzcash"}
                    onCopy={() => handleCopy(payment.jazzcash!, "jazzcash")}
                    emoji="❤️"
                  />
                )}
                {payment.bankAccount && (
                  <PaymentRow
                    label={`${payment.bankName || "Bank"} - ${payment.bankAccountName || ""}`}
                    value={payment.bankAccount}
                    copied={copiedField === "bank"}
                    onCopy={() => handleCopy(payment.bankAccount!, "bank")}
                    emoji="🏦"
                  />
                )}
              </div>

              {payment.additionalNote && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">{payment.additionalNote}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Payment complete karne ke baad owner ko chat mein batayein. Owner booking confirm karega.
                </p>
              </div>

              <Button
                className="w-full rounded-xl h-12 font-bold gap-2 bg-primary text-primary-foreground"
                onClick={() => {
                  setShowPayment(false);
                  handleOpenChat();
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Owner
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ CHAT MODAL PLACEHOLDER ═══ */}
      {showChat && (
        <ChatModal
          location={location}
          locationId={locationId}
          onClose={() => setShowChat(false)}
          user={user}
          firestore={firestore}
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat Modal Component
// ─────────────────────────────────────────────────────────────

function ChatModal({
  location,
  locationId,
  onClose,
  user,
  firestore,
}: {
  location: any;
  locationId: string;
  onClose: () => void;
  user: any;
  firestore: any;
}) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Ensure chat meta doc exists
  const initChat = useCallback(async () => {
    if (!user || !firestore || !locationId || initialized) return;
    try {
      const chatId = `loc_${locationId}_${user.uid}`;
      await setDoc(
        doc(firestore, "locationChats", chatId),
        {
          locationId,
          locationName: location.name,
          participants: [user.uid, location.ownerId],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      setInitialized(true);
    } catch (err: any) {
      console.error("[CHAT_INIT]", err);
    }
  }, [user, firestore, locationId, location, initialized]);

  // Auto-init
  useMemo(() => {
    initChat();
  }, [initChat]);

  const handleSendPaymentDetails = async () => {
    if (!user || !firestore || !locationId) return;
    try {
      const { addDoc, collection } = await import("firebase/firestore");
      const chatId = `loc_${locationId}_${user.uid}`;
      const p = location.paymentDetails || {};

      let text = "💳 *Payment Details*\n\n";
      if (p.easypaisa) text += `EasyPaisa: ${p.easypaisa}\n`;
      if (p.jazzcash) text += `JazzCash: ${p.jazzcash}\n`;
      if (p.bankAccount) text += `Bank: ${p.bankName} - ${p.bankAccount} (${p.bankAccountName})\n`;
      if (p.additionalNote) text += `\nNote: ${p.additionalNote}`;

      await addDoc(collection(firestore, "locationChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Hafash User",
        text,
        type: "payment",
        createdAt: serverTimestamp(),
        read: false,
      });

      await setDoc(
        doc(firestore, "locationChats", chatId),
        {
          lastMessage: "Payment details shared",
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
        },
        { merge: true }
      );

      toast({ title: "Payment details sent in chat" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to send" });
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !user || !firestore || !locationId || isSending) return;
    setIsSending(true);
    const text = messageText.trim();
    setMessageText("");
    try {
      const { addDoc, collection } = await import("firebase/firestore");
      const chatId = `loc_${locationId}_${user.uid}`;

      await addDoc(collection(firestore, "locationChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Hafash User",
        text,
        createdAt: serverTimestamp(),
        read: false,
      });

      await setDoc(
        doc(firestore, "locationChats", chatId),
        {
          lastMessage: text.slice(0, 100),
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to send" });
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg rounded-[2rem] border-border/40 bg-card/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7 space-y-4">

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-lg">Chat with Owner</h2>
                <p className="text-xs text-muted-foreground">{location.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Chat features abhi development mein hain. Filhal aap <strong>owner ke WhatsApp</strong> par directly message kar sakte hain.
              </p>
            </div>

            {location.whatsappNumber && (
              <Button
                className="w-full rounded-xl h-12 font-bold gap-2 bg-green-500 text-white hover:bg-green-600"
                onClick={() =>
                  window.open(
                    `https://wa.me/${location.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Salam, mujhe ${location.name} book karna hai Hafash par se.`
                    )}`,
                    "_blank"
                  )
                }
              >
                <Phone className="w-4 h-4" />
                Open WhatsApp
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full rounded-xl h-12 font-bold gap-2 border-primary/30"
              onClick={handleSendPaymentDetails}
            >
              <Wallet className="w-4 h-4" />
              Send Payment Details to Owner
            </Button>
          </div>

          {/* Simple message input */}
          <div className="pt-3 border-t border-border/20 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Quick message
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 h-11 px-4 rounded-xl border border-input bg-background text-sm"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isSending}
              />
              <Button
                size="icon"
                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground shrink-0"
                onClick={handleSend}
                disabled={!messageText.trim() || isSending}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[2rem] border-border/40 bg-card/70 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center gap-2 border-b border-border/20">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  copied,
  onCopy,
  emoji,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  emoji: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-background/40 border border-border/30 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
          <span>{emoji}</span> {label}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 rounded-lg text-xs"
          onClick={onCopy}
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="font-mono font-bold text-sm">{value}</p>
    </div>
  );
}