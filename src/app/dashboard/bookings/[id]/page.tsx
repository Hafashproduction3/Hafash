"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ArrowLeft, Check, Lock, Bell, BellOff, Upload,
  Image as ImageIcon, Save, Loader2, User, Phone,
  Calendar, CreditCard, Camera, CheckCircle2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BookingStatus {
  id: string;
  label: string;
  message: string;
  done: boolean;
  locked: boolean;
  at: string | null;
  notified: boolean;
  proof?: string | null;
  galleryId?: string | null;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [statuses, setStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!firestore || !bookingId) return;

      try {
        const snap = await getDoc(doc(firestore, "bookings", bookingId));
        if (cancelled) return;

        if (!snap.exists()) {
          toast({ variant: "destructive", title: "Booking nahi mili" });
          router.push("/dashboard/bookings");
          return;
        }

        const data = snap.data();
        setBooking({ id: snap.id, ...data });
        setStatuses(data.statuses || []);
      } catch (err) {
        console.error("[BOOKING_LOAD]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firestore, bookingId, router, toast]);

  function toggleStatus(statusId: string) {
    setStatuses(prev =>
      prev.map(s => {
        if (s.id !== statusId || s.locked) return s;
        return {
          ...s,
          done: !s.done,
          at: !s.done ? new Date().toISOString() : null,
        };
      })
    );
  }

  function updateMessage(statusId: string, message: string) {
    setStatuses(prev =>
      prev.map(s => (s.id === statusId ? { ...s, message } : s))
    );
  }

  function toggleNotify(statusId: string) {
    setStatuses(prev =>
      prev.map(s => (s.id === statusId ? { ...s, notified: !s.notified } : s))
    );
  }

  async function handleUploadProof(statusId: string, file: File) {
    setUploading(statusId);
    try {
      // TODO: R2 upload — apna existing upload function use karein
      // const url = await uploadToR2(file);
      // For now, placeholder:
      const url = URL.createObjectURL(file);
      setStatuses(prev =>
        prev.map(s => (s.id === statusId ? { ...s, proof: url } : s))
      );
      toast({ title: "Proof upload ho gaya" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload fail" });
    } finally {
      setUploading(null);
    }
  }

  function updateGalleryId(statusId: string, galleryId: string) {
    setStatuses(prev =>
      prev.map(s => (s.id === statusId ? { ...s, galleryId } : s))
    );
  }

  async function handleSave() {
    if (!firestore || !bookingId) return;
    setSaving(true);

    try {
      // Current status nikaalein
      const lastDone = [...statuses].reverse().find(s => s.done);
      const currentStatus = lastDone?.id || "received";

      // Gallery ID nikaalein (ready status se)
      const readyStatus = statuses.find(s => s.id === "ready");
      const galleryId = readyStatus?.galleryId || null;

      // Payment proof nikaalein
      const paidStatus = statuses.find(s => s.id === "paid");
      const paymentProof = paidStatus?.proof || null;

      await updateDoc(doc(firestore, "bookings", bookingId), {
        statuses,
        currentStatus,
        galleryId,
        paymentProof,
        updatedAt: new Date().toISOString(),
      });

      // Client ko notify karein (agar koi status notified hai aur done hai)
      const toNotify = statuses.filter(s => s.done && s.notified);
      for (const status of toNotify) {
        try {
          await fetch("/api/notify-client", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              statusId: status.id,
              message: status.message,
            }),
          });
          // Notified mark karein
          setStatuses(prev =>
            prev.map(s => (s.id === status.id ? { ...s, notified: false } : s))
          );
        } catch {}
      }

      toast({ title: "✅ Updates save ho gaye" });
    } catch (err) {
      console.error("[SAVE]", err);
      toast({ variant: "destructive", title: "Save fail" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Booking #{booking.id.slice(0, 6)}</h1>
          <p className="text-sm text-muted-foreground">{booking.studioName}</p>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="rounded-2xl border p-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={<User />} label="Client" value={booking.clientName} />
          <InfoRow icon={<Phone />} label="Phone" value={booking.clientPhone} />
          <InfoRow icon={<Calendar />} label="Shoot Date" value={`${booking.shootDate} ${booking.shootTime || ""}`} />
          <InfoRow icon={<CreditCard />} label="Amount" value={`Rs. ${booking.amount?.toLocaleString()}`} />
        </div>
      </div>

      {/* Status Control */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">🎛️ Status Control</h2>

        {statuses.map((status) => (
          <div
            key={status.id}
            className={cn(
              "rounded-2xl border p-5 space-y-3 transition-all",
              status.done && "bg-green-50 dark:bg-green-950/20 border-green-200"
            )}
          >
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleStatus(status.id)}
                disabled={status.locked}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {status.locked ? (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                ) : status.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className={cn("font-bold", status.done && "text-green-700")}>
                    {status.label}
                  </p>
                  {status.at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(status.at).toLocaleString()}
                    </p>
                  )}
                </div>
              </button>

              {status.done && !status.locked && (
                <button
                  onClick={() => toggleNotify(status.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                    status.notified
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {status.notified ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                  {status.notified ? "Notify ON" : "Notify OFF"}
                </button>
              )}
            </div>

            {/* Message Input */}
            {status.done && !status.locked && (
              <div className="space-y-2 pl-8">
                <label className="text-xs font-bold text-muted-foreground">
                  Client ko message:
                </label>
                <Textarea
                  value={status.message}
                  onChange={(e) => updateMessage(status.id, e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="Client ko kya dikhana hai..."
                />
              </div>
            )}

            {/* Payment Proof Upload */}
            {status.id === "paid" && status.done && (
              <div className="space-y-2 pl-8">
                <label className="text-xs font-bold text-muted-foreground">
                  Payment Proof:
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadProof(status.id, file);
                    }}
                    className="text-sm"
                  />
                  {uploading === status.id && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                {status.proof && (
                  <img
                    src={status.proof}
                    alt="Proof"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                )}
              </div>
            )}

            {/* Gallery Select */}
            {status.id === "ready" && status.done && (
              <div className="space-y-2 pl-8">
                <label className="text-xs font-bold text-muted-foreground">
                  Gallery select karein:
                </label>
                <Input
                  value={status.galleryId || ""}
                  onChange={(e) => updateGalleryId(status.id, e.target.value)}
                  placeholder="Gallery ID ya link..."
                  className="text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-end">
        <Button
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-8 shadow-2xl"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Updates
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <div className="w-4 h-4 text-muted-foreground">{icon}</div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}