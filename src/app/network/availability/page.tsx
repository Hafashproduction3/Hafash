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
} from "lucide-react";
import { cn } from "@/lib/utils";

type AvailabilityStatus = "available" | "busy" | "partial";

interface DayEntry {
  status: AvailabilityStatus;
  note?: string;
}

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

  // Map stored availability into a cleaner format
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

  const dateKey = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : "";

  const currentStatus: AvailabilityStatus | null =
    dateKey && availability[dateKey] ? availability[dateKey] : null;

  // Default to available if not set
  const effectiveStatus: AvailabilityStatus = currentStatus || "available";

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let available = 0;
    let busy = 0;
    let partial = 0;

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

  // Set status for a single date
  const setStatus = useCallback(
    async (status: AvailabilityStatus) => {
      if (!user || !firestore || !dateKey || isSaving) return;

      setIsSaving(true);
      try {
        const ref = doc(firestore, "networkProfiles", user.uid);

        if (status === "available") {
          // Available = default → delete the field (keeps DB clean)
          await updateDoc(ref, {
            [`availability.${dateKey}`]: deleteField(),
          });
        } else {
          await updateDoc(ref, {
            [`availability.${dateKey}`]: status,
          });
        }

        toast({
          title: "Updated",
          description:
            status === "available"
              ? `${dateKey} marked as available.`
              : `${dateKey} marked as ${status}.`,
        });
      } catch (error) {
        console.error("[NETWORK_AVAILABILITY] Error:", error);
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: "Unable to update your availability.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [user, firestore, dateKey, isSaving, toast]
  );

  // Bulk update a range of dates
  const setStatusForRange = useCallback(
    async (start: Date, end: Date, status: AvailabilityStatus) => {
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

        toast({
          title: "Range Updated",
          description: `${status} applied to selected dates.`,
        });
        setQuickRangeStart(undefined);
        setQuickRangeEnd(undefined);
        setShowRangeMode(false);
      } catch (error) {
        console.error("[NETWORK_AVAILABILITY] Range error:", error);
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: "Unable to update your availability.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [user, firestore, isSaving, toast]
  );

  // Quick actions
  const markNextWeekends = () => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 60);
    // Mark all Saturdays as busy (simple example)
    setStatusForRange(today, end, "busy");
  };

  // Get dates by status for calendar highlighting
  const statusDates = (status: AvailabilityStatus) =>
    Object.entries(availability)
      .filter(([, value]) => value === status)
      .map(([date]) => new Date(`${date}T00:00:00`));

  // Reset all availability
  const handleResetAll = async () => {
    if (!user || !firestore || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, "networkProfiles", user.uid), {
        availability: {},
      });
      toast({ title: "Reset Complete", description: "All dates now available." });
    } catch (error: any) {
      console.error("[NETWORK_AVAILABILITY] Reset error:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error?.message || "Something went wrong.",
      });
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

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-6 py-7 lg:px-8 lg:py-8 shadow-sm">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => router.back()}
              >
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

        {loading ? (
          <Card className="bg-card border-border/50 rounded-3xl">
            <CardContent className="p-10 text-center text-muted-foreground">
              Loading your availability...
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card className="bg-card border-border/50 rounded-3xl">
            <CardContent className="p-10 text-center space-y-4">
              <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">
                Join Hafash Network first to manage your availability.
              </p>
              <Button onClick={() => router.push("/network/join")}>
                Join Hafash Network
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Available
                  </p>
                  <p className="text-xl font-headline font-bold text-green-500">
                    {stats.available}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Partial
                  </p>
                  <p className="text-xl font-headline font-bold text-yellow-500">
                    {stats.partial}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Busy
                  </p>
                  <p className="text-xl font-headline font-bold text-red-500">
                    {stats.busy}
                  </p>
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
              {/* Calendar */}
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
                      selected={{
                        from: quickRangeStart,
                        to: quickRangeEnd,
                      }}
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

                {/* Legend */}
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

              {/* Sidebar Actions */}
              <div className="space-y-6">
                {showRangeMode ? (
                  // Range Mode Actions
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
                        onClick={() =>
                          quickRangeStart &&
                          quickRangeEnd &&
                          setStatusForRange(quickRangeStart, quickRangeEnd, "busy")
                        }
                      >
                        <X className="w-4 h-4" />
                        Mark Busy
                      </Button>

                      <Button
                        className="w-full justify-start gap-3 rounded-xl bg-yellow-500/90 hover:bg-yellow-500 text-black"
                        disabled={!quickRangeStart || !quickRangeEnd || isSaving}
                        onClick={() =>
                          quickRangeStart &&
                          quickRangeEnd &&
                          setStatusForRange(quickRangeStart, quickRangeEnd, "partial")
                        }
                      >
                        <Clock className="w-4 h-4" />
                        Mark Partial
                      </Button>

                      <Button
                        className="w-full justify-start gap-3 rounded-xl bg-green-500/90 hover:bg-green-500 text-white"
                        disabled={!quickRangeStart || !quickRangeEnd || isSaving}
                        onClick={() =>
                          quickRangeStart &&
                          quickRangeEnd &&
                          setStatusForRange(quickRangeStart, quickRangeEnd, "available")
                        }
                      >
                        <Check className="w-4 h-4" />
                        Mark Available
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  // Single Date Actions
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
                        <p className="text-xs font-bold uppercase text-muted-foreground">
                          Current Status
                        </p>

                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-lg px-3 py-1",
                            effectiveStatus === "available" &&
                              "bg-green-500/10 text-green-500 border-green-500/30",
                            effectiveStatus === "partial" &&
                              "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
                            effectiveStatus === "busy" &&
                              "bg-red-500/10 text-red-500 border-red-500/30"
                          )}
                        >
                          {effectiveStatus === "available" &&
                            (currentStatus ? "Available" : "Available (default)")}
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
                            <span className="text-green-400 font-bold">Available</span> is the
                            default — no action needed.
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                          <p>
                            Mark <span className="text-red-400 font-bold">Busy</span> only when
                            you&apos;re booked.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
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
          </>
        )}
      </div>
    </div>
  );
}