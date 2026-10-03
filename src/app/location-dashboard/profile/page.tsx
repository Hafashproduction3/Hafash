"use client";

import { useMemo, useState, useEffect } from "react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  Camera,
  Building2,
  Shield,
  ShieldCheck,
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wallet,
  FileText,
  Percent,
  CreditCard,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LocationDashboardProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  // Invoice settings
  const [advancePercent, setAdvancePercent] = useState(30);
  const [dueDays, setDueDays] = useState(7);
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Payment details
  const [bankName, setBankName] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [easypaisaNumber, setEasypaisaNumber] = useState("");
  const [jazzcashNumber, setJazzcashNumber] = useState("");

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading } = useDoc(userRef);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setWhatsappNumber(profile.whatsappNumber || "");
      setCity(profile.city || "");
      setBio(profile.bio || "");

      setAdvancePercent(profile.invoiceSettings?.advancePercent ?? 30);
      setDueDays(profile.invoiceSettings?.dueDays ?? 7);
      setInvoiceNotes(profile.invoiceSettings?.notes || "");

      setBankName(profile.paymentDetails?.bankName || "");
      setAccountTitle(profile.paymentDetails?.accountTitle || "");
      setAccountNumber(profile.paymentDetails?.accountNumber || "");
      setEasypaisaNumber(profile.paymentDetails?.easypaisaNumber || "");
      setJazzcashNumber(profile.paymentDetails?.jazzcashNumber || "");
    }
  }, [profile]);

  const verificationStatus = profile?.verification?.status || "unverified";
  const isVerified = verificationStatus === "verified";

  // Save profile
  const handleSaveProfile = async () => {
    if (!firestore || !user) return;
    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Apna poora naam likhein.",
      });
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber.replace(/\s+/g, ""),
        city: city.trim(),
        bio: bio.trim(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Profile saved",
        description: "Aapki profile update ho gayi.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Save invoice + payment settings
  const handleSaveInvoiceSettings = async () => {
    if (!firestore || !user) return;

    if (advancePercent < 0 || advancePercent > 100) {
      toast({
        variant: "destructive",
        title: "Invalid advance %",
        description: "0 se 100 ke darmiyan rakhein.",
      });
      return;
    }

    setSavingInvoice(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        invoiceSettings: {
          advancePercent,
          dueDays,
          notes: invoiceNotes.trim(),
        },
        paymentDetails: {
          bankName: bankName.trim(),
          accountTitle: accountTitle.trim(),
          accountNumber: accountNumber.trim(),
          easypaisaNumber: easypaisaNumber.replace(/\s+/g, ""),
          jazzcashNumber: jazzcashNumber.replace(/\s+/g, ""),
        },
        invoiceCounter: profile?.invoiceCounter ?? 0,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Invoice settings saved",
        description: "Bookings par auto-invoice in settings se banega.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    } finally {
      setSavingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <Skeleton className="h-40 rounded-[2rem] bg-card/20" />
        <Skeleton className="h-64 rounded-2xl bg-card/20" />
        <Skeleton className="h-64 rounded-2xl bg-card/20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ═══ HEADER ═══ */}
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-background p-8 lg:p-10">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-center lg:items-end gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
              <User className="w-12 h-12 text-primary" />
            </div>
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-4 border-background">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                Location Owner
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
              {fullName || "Owner"}{" "}
              <span className="text-primary italic">Profile</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
              {isVerified ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase tracking-widest gap-1">
                  <Shield className="w-3 h-3" />
                  Unverified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PROFILE INFO ═══ */}
      <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-headline font-bold">Profile Info</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  value={user?.email || ""}
                  readOnly
                  disabled
                  className="pl-10 h-12 rounded-xl bg-background/30 border-border/30 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                WhatsApp
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="03001234567"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                City
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Karachi"
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Bio (Optional)
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Apne baare mein ya apni locations ke baare mein likhein..."
                rows={3}
                className="rounded-xl bg-background/50 border-border/50 resize-none"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="mt-6 rounded-2xl h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ═══ INVOICE SETTINGS ═══ */}
      <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-headline font-bold">Invoice Settings</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Booking confirm hone par auto-invoice in settings se banega.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Advance % *
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(parseInt(e.target.value) || 0)}
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Booking amount ka kitna % advance lena hai (e.g. 30)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Due Days
              </Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 w-4 h-4 text-primary" />
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={dueDays}
                  onChange={(e) => setDueDays(parseInt(e.target.value) || 7)}
                  className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Invoice issue hone ke baad kitne din mein payment due
              </p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Invoice Notes (Optional)
              </Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="E.g., Payment due within 7 days. 50% advance required for booking confirmation."
                rows={3}
                className="rounded-xl bg-background/50 border-border/50 resize-none"
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-headline font-bold">Payment Details</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Yeh details invoice par dikhengi taake client payment kar sake.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Bank Name
                </Label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HBL, Meezan, etc."
                    className="pl-10 h-12 rounded-xl bg-background/50 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Account Title
                </Label>
                <Input
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="Account holder name"
                  className="h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Account Number / IBAN
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="PK00XXXX0000000000000000"
                  className="h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Easypaisa Number
                </Label>
                <Input
                  value={easypaisaNumber}
                  onChange={(e) => setEasypaisaNumber(e.target.value)}
                  placeholder="03001234567"
                  className="h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  JazzCash Number
                </Label>
                <Input
                  value={jazzcashNumber}
                  onChange={(e) => setJazzcashNumber(e.target.value)}
                  placeholder="03001234567"
                  className="h-12 rounded-xl bg-background/50 border-border/50"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveInvoiceSettings}
            disabled={savingInvoice}
            className="mt-6 rounded-2xl h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
          >
            {savingInvoice ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Invoice Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ═══ VERIFICATION STATUS ═══ */}
      <Card className="bg-card/40 border-border/40 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-headline font-bold">Verification</h2>
          </div>

          {isVerified ? (
            <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-green-400">Aapka account Verified hai</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aapki listings par "Verified" badge dikhega — zyada trust aur bookings.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-400">Account unverified hai</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verification abhi available nahi hai. Jab launch hoga, aapko notify karenge.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}