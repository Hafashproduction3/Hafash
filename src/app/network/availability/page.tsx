"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  X,
  Sparkles,
  Zap,
  Layers,
  Info,
  Trash2,
  Globe,
  ArrowRight,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_DEFINITIONS, TURNAROUND_OPTIONS } from "@/lib/equipment";

type AvailabilityStatus = "available" | "busy" | "partial";

const REMOTE_ROLES = ['video_editor', 'photo_editor', 'album_designer'];

export default function AvailabilityPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "networkProfiles", user.uid);
  }, [firestore, user]);

  const { data: profile, loading } = useDoc(profileRef);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [quickRangeStart, setQuickRangeStart] = useState<Date | undefined>();
  const [quickRangeEnd, setQuickRangeEnd] = useState<Date | undefined>();
  const [showRangeMode, setShowRangeMode] = useState(false);

  // Role analysis
  const roles: string[] = profile?.roles || [];
  const onSiteRoles = roles.filter(r => !REMOTE_ROLES.includes(r));
  const remoteRoles = roles.filter(r => REMOTE_ROLES.includes(r));
  const hasOnSite = onSiteRoles.length > 0;
  const hasRemote = remoteRoles.length > 0;
  const isRemoteOnly = !hasOnSite && hasRemote;

  const availability: Record<string, AvailabilityStatus> = useMemo(() => {
    const raw = profile?.availability || {};
    const result: Record<string, AvailabilityStatus> = {};
    Object.entries(raw).forEach(([date, value]) => {
      if (typeof value === "string") {
        result[date] = value as AvailabilityStatus;
      } else if (value && typeof value === "object" && "status" in value) {
        result[date] = (value as any).status as AvailabilityStatus;
      }
    });
    return result;
  }, [profile?.availability]);

  const dateKey = selectedDate ? selectedDate.toISOString().split("T")[0] : "";
  const currentStatus: AvailabilityStatus | null = dateKey && availability[dateKey] ? availability[dateKey] : null;
  const effectiveStatus: AvailabilityStatus = currentStatus || "available";

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let available = 0, busy = 0, partial = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const key = d.toISOString().split("T")[0];
      const status = availability[key] || "available";
      if (status === "available") available++;
      else if (status === "busy") busy++;
      else if (status === "partial") partial++;
    }
    return { available, busy, partial, total: daysInMonth };
  }, [availability]);

  const setStatus = useCallback(async (status: AvailabilityStatus) => {
    if (!user || !firestore || !dateKey || isSaving) return;
    setIsSaving(true);
    try {
      const ref = doc(firestore, "networkProfiles", user.uid);
      if (status === "available") {
        await updateDoc(ref, { [`availability.${dateKey}`]: deleteField() });
      } else {
        await updateDoc(ref, { [`availability.${dateKey}`]: status });
      }
      toast({
        title: "Updated",
        description: status === "available" ? `${dateKey} marked as available.` : `${dateKey} marked as ${status}.`,
      });
    } catch (error) {
      console.error("[NETWORK_AVAILABILITY] Error:", error);
      toast({ variant: "destructive", title: "Something went wrong" });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, dateKey, isSaving, toast]);

  const setStatusForRange = useCallback(async (start: Date, end: Date, status: AvailabilityStatus) => {
    if (!user || !firestore || isSaving) return;
    setIsSaving(true);
    try {
      const ref = doc(firestore, "networkProfiles", user.uid);
      const updatePayload: any = {};
      const current = new Date(start);
      while (current <= end) {
        const key = current.toISOString().split("T")[0];
        if (status === "available") {
          updatePayload[`availability.${key}`] = deleteField();
        } else {
          updatePayload[`availability.${key}`] = status;
        }
        current.setDate(current.getDate() + 1);
      }
      await updateDoc(ref, updatePayload);
      toast({ title: "Range Updated", description: `${status} applied to selected dates.` });
      setQuickRangeStart(undefined);
      setQuickRangeEnd(undefined);
      setShowRangeMode(false);
    } catch (error) {
      console.error("[NETWORK_AVAILABILITY] Range error:", error);
      toast({ variant: "destructive", title: "Something went wrong" });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, isSaving, toast]);

  const markNextWeekends = () => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 60);
    setStatusForRange(today, end, "busy");
  };

  const statusDates = (status: AvailabilityStatus) =>
    Object.entries(availability)
      .filter(([, value]) => value === status)
      .map(([date]) => new Date(`${date}T00:00:00`));

  const handleResetAll = async () => {
    if (!user || !firestore || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, "networkProfiles", user.uid), { availability: {} });
      toast({ title: "Reset Complete", description: "All dates now available." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error?.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to manage availability.</p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="bg-card border-border/50 rounded-3xl">
            <CardContent className="p-10 text-center space-y-4">
              <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">
                Join Hafash Network first to manage your availability.
              </p>
              <Button onClick={() => router.push("/network/join")}>
                Join Hafash Network
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // REMOTE-ONLY USER — No calendar needed
  // ═══════════════════════════════════════════════════════════════
  if (isRemoteOnly) {
    const turnarounds = profile?.turnarounds || {};

    return (
      <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
        <div className="max-w-3xl mx-auto space-y-6">

          <Button
            variant="ghost"
            className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Info Card */}
          <Card className="relative overflow-hidden rounded-[2rem] border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card/60 to-background shadow-xl">
            <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            <CardContent className="relative p-7 lg:p-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <Globe className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 rounded-lg mb-2">
                    Remote Professional
                  </Badge>
                  <h1 className="text-2xl lg:text-3xl font-headline font-bold tracking-tight">
                    Aap Remote Professional Hain
                  </h1>
                </div>
              </div>

              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                Aap <span className="font-bold text-purple-400">{remoteRoles.map(r => ROLE_DEFINITIONS[r as keyof typeof ROLE_DEFINITIONS]?.label).join(", ")}</span> ka kaam karte hain — isme calendar ki zaroorat nahi hoti.
                Aapka <span className="font-bold text-foreground">delivery time</span> hi clients ko dikhta hai.
              </p>

              {/* Show current turnarounds */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Aapka Delivery Time
                </p>

                {remoteRoles.map((roleId: string) => {
                  const role = ROLE_DEFINITIONS[roleId as keyof typeof ROLE_DEFINITIONS];
                  const turnId = turnarounds[roleId];
                  const turnOpt = TURNAROUND_OPTIONS.find(t => t.id === turnId);

                  return (
                    <div
                      key={roleId}
                      className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-purple-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Film className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{role?.label}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            Remote Service
                          </p>
                        </div>
                      </div>

                      <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 px-3 py-1.5 font-bold gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {turnOpt?.short || "Not set"}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Delivery time badalne ke liye <span className="font-bold text-foreground">Edit Profile</span> par jayein.
                  Wahan aap har remote role ke liye time set kar sakte hain.
                </p>
              </div>

              <Button
                className="w-full rounded-2xl h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={() => router.push("/network/join")}
              >
                <Sparkles className="w-4 h-4" />
                Edit Profile
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ON-SITE USER (or both) — Show calendar
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-6 py-7 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Smart Availability
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-headline font-bold tracking-tight">
                  My Availability
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Everything is <span className="text-green-500 font-bold">available</span> by default.
                  Just mark the days you&apos;re busy.
                </p>
                {hasRemote && (
                  <p className="text-xs text-purple-400 mt-2 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    Aapke remote kaam (Video/Photo editing) ki delivery time profile mein set hai.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => setShowRangeMode(!showRangeMode)}
              >
                <Layers className="w-4 h-4" />
                {showRangeMode ? "Cancel Range" : "Select Range"}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleResetAll}
                disabled={isSaving}
              >
                <Trash2 className="w-4 h-4" />
                Reset All
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available</p>
              <p className="text-xl font-headline font-bold text-green-500">{stats.available}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Partial</p>
              <p className="text-xl font-headline font-bold text-yellow-500">{stats.partial}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <X className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Busy</p>
              <p className="text-xl font-headline font-bold text-red-500">{stats.busy}</p>
            </div>
          </div>
        </div>

        {/* Range Mode Banner */}
        {showRangeMode && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Select a Date Range</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pick the start and end dates below. Then choose a status.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-background/30 border-b border-border/30">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                {showRangeMode ? "Select Range" : "Select a date"}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 flex justify-center">
              {showRangeMode ? (
                <Calendar
                  mode="range"
                  selected={{ from: quickRangeStart, to: quickRangeEnd }}
                  onSelect={(range: any) => {
                    setQuickRangeStart(range?.from);
                    setQuickRangeEnd(range?.to);
                  }}
                  modifiers={{
                    available: statusDates("available"),
                    busy: statusDates("busy"),
                    partial: statusDates("partial"),
                  }}
                  modifiersClassNames={{
                    available: "bg-green-500/20 text-green-400 rounded-md",
                    busy: "bg-red-500/20 text-red-400 rounded-md",
                    partial: "bg-yellow-500/20 text-yellow-400 rounded-md",
                  }}
                  className="rounded-xl"
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    available: statusDates("available"),
                    busy: statusDates("busy"),
                    partial: statusDates("partial"),
                  }}
                  modifiersClassNames={{
                    available: "bg-green-500/20 text-green-400 rounded-md",
                    busy: "bg-red-500/20 text-red-400 rounded-md",
                    partial: "bg-yellow-500/20 text-yellow-400 rounded-md",
                  }}
                  className="rounded-xl"
                />
              )}
            </CardContent>

            <div className="px-6 pb-6 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-muted-foreground">Available (default)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="text-muted-foreground">Partial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="text-muted-foreground">Busy</span>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {showRangeMode ? (
              <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-background/30 border-b border-border/30">
                  <CardTitle className="text-lg font-headline font-bold">
                    {quickRangeStart && quickRangeEnd
                      ? `Range: ${quickRangeStart.toLocaleDateString()} → ${quickRangeEnd.toLocaleDateString()}`
                      : "Pick a range"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-3">
                  <Button
                    className="w-full justify-start gap-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white"
                    disabled={!quickRangeStart || !quickRangeEnd || isSaving}
                    onClick={() => quickRangeStart && quickRangeEnd && setStatusForRange(quickRangeStart, quickRangeEnd, "busy")}
                  >
                    <X className="w-4 h-4" />
                    Mark Busy
                  </Button>

                  <Button
                    className="w-full justify-start gap-3 rounded-xl bg-yellow-500/90 hover:bg-yellow-500 text-black"
                    disabled={!quickRangeStart || !quickRangeEnd || isSaving}
                    onClick={() => quickRangeStart && quickRangeEnd && setStatusForRange(quickRangeStart, quickRangeEnd, "partial")}
                  >
                    <Clock className="w-4 h-4" />
                    Mark Partial
                  </Button>

                  <Button
                    className="w-full justify-start gap-3 rounded-xl bg-green-500/90 hover:bg-green-500 text-white"
                    disabled={!quickRangeStart || !quickRangeEnd || isSaving}
                    onClick={() => quickRangeStart && quickRangeEnd && setStatusForRange(quickRangeStart, quickRangeEnd, "available")}
                  >
                    <Check className="w-4 h-4" />
                    Mark Available
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-background/30 border-b border-border/30">
                  <CardTitle className="text-lg font-headline font-bold">
                    {selectedDate
                      ? selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Select a date"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Current Status</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-lg px-3 py-1",
                        effectiveStatus === "available" && "bg-green-500/10 text-green-500 border-green-500/30",
                        effectiveStatus === "partial" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
                        effectiveStatus === "busy" && "bg-red-500/10 text-red-500 border-red-500/30"
                      )}
                    >
                      {effectiveStatus === "available" && (currentStatus ? "Available" : "Available (default)")}
                      {effectiveStatus === "partial" && "Partial"}
                      {effectiveStatus === "busy" && "Busy"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className={cn(
                        "w-full justify-start gap-3 rounded-xl",
                        effectiveStatus === "available"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30"
                      )}
                      disabled={isSaving}
                      onClick={() => setStatus("available")}
                    >
                      <Check className="w-4 h-4" />
                      Available
                    </Button>

                    <Button
                      className={cn(
                        "w-full justify-start gap-3 rounded-xl",
                        effectiveStatus === "partial"
                          ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                          : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30"
                      )}
                      disabled={isSaving}
                      onClick={() => setStatus("partial")}
                    >
                      <Clock className="w-4 h-4" />
                      Partial
                    </Button>

                    <Button
                      className={cn(
                        "w-full justify-start gap-3 rounded-xl",
                        effectiveStatus === "busy"
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30"
                      )}
                      disabled={isSaving}
                      onClick={() => setStatus("busy")}
                    >
                      <X className="w-4 h-4" />
                      Busy
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border/20 space-y-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <p>
                        <span className="text-green-400 font-bold">Available</span> is the default — no action needed.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <p>
                        Mark <span className="text-red-400 font-bold">Busy</span> only when you&apos;re booked.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-background/30 border-b border-border/30">
                <CardTitle className="text-sm font-headline font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl text-xs"
                  onClick={() => setShowRangeMode(true)}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Mark Multi-Day Event
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl text-xs"
                  onClick={markNextWeekends}
                  disabled={isSaving}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Mark Next 60 Days Busy
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}