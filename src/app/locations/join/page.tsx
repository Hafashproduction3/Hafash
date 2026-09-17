"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  Clock,
  Users,
  DollarSign,
  Image as ImageIcon,
  Sparkles,
  Info,
  Wallet,
  Instagram,
  Phone,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  LOCATION_CATEGORIES,
  AMENITIES,
  OPENING_HOURS,
  compressImage,
  type LocationCategory,
  type PaymentDetails,
  formatTime12h,
} from "@/lib/locations";
import { requestUploadUrl, getMusicSignedUrl } from "@/app/actions/storage";

const MAX_PHOTOS = 10;

interface UploadedPhoto {
  url: string;
  key: string;
  name: string;
}

export default function LocationJoinPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Load existing profile
  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userProfile } = useDoc(profileRef);

  // Existing location data
  const locationRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "shootLocations", user.uid);
  }, [firestore, user?.uid]);
  const { data: existingLocation, loading: loadingLocation } = useDoc(locationRef);

  // ─── Form State ───
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LocationCategory | "">("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [description, setDescription] = useState("");

  const [hourlyRate, setHourlyRate] = useState("");
  const [minHours, setMinHours] = useState("2");
  const [maxHours, setMaxHours] = useState("8");

  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [maxPeople, setMaxPeople] = useState("10");

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramLink, setInstagramLink] = useState("");

  // Payment details
  const [easypaisa, setEasypaisa] = useState("");
  const [jazzcash, setJazzcash] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [preferredMethod, setPreferredMethod] = useState<'easypaisa' | 'jazzcash' | 'bank' | 'cash'>("easypaisa");
  const [paymentNote, setPaymentNote] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // ─── Populate from existing ───
  useEffect(() => {
    if (existingLocation) {
      setName(existingLocation.name || "");
      setCategory(existingLocation.category || "");
      setCity(existingLocation.city || "");
      setArea(existingLocation.area || "");
      setFullAddress(existingLocation.fullAddress || "");
      setGoogleMapsLink(existingLocation.googleMapsLink || "");
      setDescription(existingLocation.description || "");
      setHourlyRate(String(existingLocation.hourlyRate || ""));
      setMinHours(String(existingLocation.minHours || 2));
      setMaxHours(String(existingLocation.maxHours || 8));
      setOpenTime(existingLocation.openTime || "09:00");
      setCloseTime(existingLocation.closeTime || "21:00");
      setMaxPeople(String(existingLocation.maxPeople || 10));
      setSelectedAmenities(existingLocation.amenities || []);
      setPhotos(existingLocation.photos || []);
      setWhatsappNumber(existingLocation.whatsappNumber || "");
      setInstagramLink(existingLocation.instagramLink || "");

      const pd = existingLocation.paymentDetails || {};
      setEasypaisa(pd.easypaisa || "");
      setJazzcash(pd.jazzcash || "");
      setBankName(pd.bankName || "");
      setBankAccount(pd.bankAccount || "");
      setBankAccountName(pd.bankAccountName || "");
      setPreferredMethod(pd.preferredMethod || "easypaisa");
      setPaymentNote(pd.additionalNote || "");
    }
  }, [existingLocation]);

  // ─── Toggle amenity ───
  const toggleAmenity = useCallback((id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }, []);

  // ─── Photo upload ───
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user || !firestore) return;

    const files = Array.from(e.target.files);
    const remaining = MAX_PHOTOS - photos.length;

    if (files.length > remaining) {
      toast({
        variant: "destructive",
        title: "Too many photos",
        description: `Aap sirf ${remaining} aur photos add kar sakte hain.`,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate image
        if (!file.type.startsWith("image/")) {
          toast({ variant: "destructive", title: `${file.name} image nahi hai` });
          continue;
        }

        // Compress
        const compressed = await compressImage(file, 1200, 0.8);

        // Get signed URL
        const { success, uploadUrl, key, error } = await requestUploadUrl({
          userId: user.uid,
          galleryId: `location-${user.uid}`,
          fileName: `location-${Date.now()}-${i}.jpg`,
          contentType: "image/jpeg",
          fileSize: compressed.size,
        });

        if (!success || !uploadUrl || !key) {
          throw new Error(error || "Upload authorization failed");
        }

        // Upload to R2
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 rejected: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", "image/jpeg");
          xhr.send(compressed);
        });

        // Get public URL
        const urlResult = await getMusicSignedUrl(key);
        if (urlResult.success && urlResult.url) {
          setPhotos((prev) => [
            ...prev,
            { url: urlResult.url!, key, name: file.name },
          ]);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast({ title: "Photos uploaded", description: `${files.length} photos added.` });
    } catch (err: any) {
      console.error("[PHOTO_UPLOAD] Error:", err);
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const removePhoto = async (idx: number) => {
    const photo = photos[idx];
    if (!photo) return;
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    // Optionally delete from R2 (silent)
    // Skip for now to avoid complexity
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!user || !firestore) return;

    // Validations
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Location name required" });
      return;
    }
    if (!category) {
      toast({ variant: "destructive", title: "Category required" });
      return;
    }
    if (!city.trim()) {
      toast({ variant: "destructive", title: "City required" });
      return;
    }
    if (!hourlyRate || Number(hourlyRate) <= 0) {
      toast({ variant: "destructive", title: "Hourly rate required" });
      return;
    }
    if (photos.length === 0) {
      toast({ variant: "destructive", title: "At least 1 photo required" });
      return;
    }
    if (!easypaisa && !jazzcash && !bankAccount) {
      toast({
        variant: "destructive",
        title: "Payment details required",
        description: "Kam az kam ek payment method add karein.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const paymentDetails: PaymentDetails = {
        easypaisa: easypaisa.trim(),
        jazzcash: jazzcash.trim(),
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountName: bankAccountName.trim(),
        preferredMethod,
        additionalNote: paymentNote.trim(),
      };

      await setDoc(
        doc(firestore, "shootLocations", user.uid),
        {
          ownerId: user.uid,
          ownerName:
            userProfile?.studioName ||
            userProfile?.photographerName ||
            user.displayName ||
            "Hafash Owner",
          name: name.trim(),
          category,
          city: city.trim(),
          area: area.trim(),
          fullAddress: fullAddress.trim(),
          googleMapsLink: googleMapsLink.trim(),
          description: description.trim(),
          hourlyRate: Number(hourlyRate),
          minHours: Number(minHours) || 2,
          maxHours: Number(maxHours) || 8,
          openTime,
          closeTime,
          maxPeople: Number(maxPeople) || 10,
          amenities: selectedAmenities,
          photos,
          whatsappNumber: whatsappNumber.trim(),
          instagramLink: instagramLink.trim(),
          paymentDetails,
          bookedSlots: existingLocation?.bookedSlots || {},
          rating: existingLocation?.rating || { average: 0, count: 0 },
          isActive: true,
          createdAt: existingLocation?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: existingLocation ? "Location Updated" : "Location Added!",
        description: "Aapki shoot location ab Hafash par live hai.",
      });
      router.push("/locations");
    } catch (err: any) {
      console.error("[LOCATION_SAVE] Error:", err);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  if (loadingLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-6 py-7 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Shoot Locations
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-headline font-bold tracking-tight">
                {existingLocation ? "Edit Your Location" : "Add Your Location"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Apni villa, studio, garden, ya venue Hafash par list karein.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ BASIC INFO ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Location Name *
              </label>
              <Input
                placeholder="e.g. Noori House, Sunset Villa, Studio 21"
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Category *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {LOCATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2",
                      category === cat.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-xs font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* City + Area */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  City *
                </label>
                <Input
                  placeholder="Karachi"
                  className="h-12 rounded-xl"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Area
                </label>
                <Input
                  placeholder="DHA Phase 5"
                  className="h-12 rounded-xl"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
            </div>

            {/* Full Address */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Full Address
              </label>
              <Textarea
                placeholder="House 123, Street 45, Block A, DHA Phase 5, Karachi"
                className="rounded-xl min-h-[70px]"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Exact address sirf booking confirm hone ke baad share hota hai.
              </p>
            </div>

            {/* Google Maps */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Google Maps Link (optional)
              </label>
              <Input
                placeholder="https://maps.google.com/..."
                className="h-12 rounded-xl"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="Location ki khaas baatein — lights, garden, view, etc."
                className="rounded-xl min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {description.length} / 500
              </p>
            </div>

          </CardContent>
        </Card>

        {/* ═══ RATES & HOURS ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Rates & Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* Rate */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 md:col-span-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Hourly Rate (Rs.) *
                </label>
                <Input
                  type="number"
                  placeholder="5000"
                  className="h-12 rounded-xl"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Min Hours
                </label>
                <Input
                  type="number"
                  placeholder="2"
                  className="h-12 rounded-xl"
                  value={minHours}
                  onChange={(e) => setMinHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Max Hours
                </label>
                <Input
                  type="number"
                  placeholder="8"
                  className="h-12 rounded-xl"
                  value={maxHours}
                  onChange={(e) => setMaxHours(e.target.value)}
                />
              </div>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Opens At
                </label>
                <select
                  className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                >
                  {OPENING_HOURS.map((h) => (
                    <option key={h} value={h}>{formatTime12h(h)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Closes At
                </label>
                <select
                  className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                >
                  {OPENING_HOURS.map((h) => (
                    <option key={h} value={h}>{formatTime12h(h)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max People */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Max People Allowed
              </label>
              <Input
                type="number"
                placeholder="10"
                className="h-12 rounded-xl"
                value={maxPeople}
                onChange={(e) => setMaxPeople(e.target.value)}
              />
            </div>

          </CardContent>
        </Card>

        {/* ═══ AMENITIES ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold">
              Facilities & Amenities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const selected = selectedAmenities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAmenity(a.id)}
                    className={cn(
                      "px-3 py-2 rounded-xl border-2 transition-all text-xs font-bold flex items-center gap-2",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span className="text-base">{a.emoji}</span>
                    {a.label}
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ═══ PHOTOS ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Photos ({photos.length}/{MAX_PHOTOS})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Location ki khoobsurat tasveerein upload karein. Auto-compressed hongi.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            {/* Upload Box */}
            {photos.length < MAX_PHOTOS && (
              <label
                className={cn(
                  "relative h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
                  uploading
                    ? "border-primary/50 bg-primary/5 cursor-wait"
                    : "border-border/40 bg-background/30 hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-sm font-bold">Uploading... {uploadProgress}%</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-primary mb-2" />
                    <p className="text-sm font-bold">Click to upload photos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG / PNG • Auto-compressed to 1200px
                    </p>
                  </>
                )}
              </label>
            )}

            {/* Photos Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border/40 group"
                  >
                    <img
                      src={p.url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold uppercase tracking-widest text-white bg-primary px-2 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ CONTACT ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                WhatsApp Number
              </label>
              <Input
                placeholder="+92 300 1234567"
                className="h-12 rounded-xl"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram (optional)
              </label>
              <Input
                placeholder="https://instagram.com/yourlocation"
                className="h-12 rounded-xl"
                value={instagramLink}
                onChange={(e) => setInstagramLink(e.target.value)}
              />
            </div>

          </CardContent>
        </Card>

        {/* ═══ PAYMENT DETAILS ═══ */}
        <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-background/30 border-b border-border/30">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Payment Details *
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Ye details chat mein share hongi jab koi book karna chahe. Paisa directly aapko milega.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            {/* Preferred Method */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Preferred Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['easypaisa', 'jazzcash', 'bank', 'cash'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPreferredMethod(method)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all",
                      preferredMethod === method
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* EasyPaisa */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <span className="text-emerald-400">💚</span> EasyPaisa Number
              </label>
              <Input
                placeholder="0300-1234567"
                className="h-12 rounded-xl"
                value={easypaisa}
                onChange={(e) => setEasypaisa(e.target.value)}
              />
            </div>

            {/* JazzCash */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <span className="text-red-400">❤️</span> JazzCash Number
              </label>
              <Input
                placeholder="0301-1234567"
                className="h-12 rounded-xl"
                value={jazzcash}
                onChange={(e) => setJazzcash(e.target.value)}
              />
            </div>

            {/* Bank */}
            <div className="space-y-3 pt-3 border-t border-border/20">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                🏦 Bank Account (optional)
              </label>
              <Input
                placeholder="Bank Name (e.g. HBL, Meezan)"
                className="h-12 rounded-xl"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <Input
                placeholder="Account Number / IBAN"
                className="h-12 rounded-xl"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
              />
              <Input
                placeholder="Account Holder Name"
                className="h-12 rounded-xl"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
              />
            </div>

            {/* Additional Note */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Additional Note (optional)
              </label>
              <Input
                placeholder="e.g. Advance 50% required, cash on site"
                className="h-12 rounded-xl"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>

          </CardContent>
        </Card>

        {/* ═══ SUBMIT ═══ */}
        <Button
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold shadow-2xl shadow-primary/20"
          onClick={handleSave}
          disabled={isSaving || uploading}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Saving...
            </>
          ) : existingLocation ? (
            "Update Location"
          ) : (
            "Publish Location"
          )}
        </Button>

      </div>
    </div>
  );
}