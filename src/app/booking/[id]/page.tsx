"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useFirestore } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  CheckCircle2, Circle, Loader2, Camera, Calendar,
  User, Phone, CreditCard, ExternalLink, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingStatus {
  id: string;
  label: string;
  message: string;
  done: boolean;
  locked: boolean;
  at: string | null;
  proof?: string | null;
  galleryId?: string | null;
}

export default function BookingTrackingPage() {
  const params = useParams();
  const bookingId = params?.id as string;
  const firestore = useFirestore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!firestore || !bookingId) return;

    // Real-time listener
    const unsubscribe = onSnapshot(
      doc(firestore, "bookings", bookingId),
      (snap) => {
        if (snap.exists()) {
          setBooking({ id: snap.id, ...snap.data() });
        } else {
          setNotFound(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[TRACKING]", err);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Nahi Mili</h1>
        <p className="text-muted-foreground mb-6">
          Yeh booking ID exist nahi karti ya delete ho gayi hai.
        </p>
        <Link href="/">
          <Button>Home Page</Button>
        </Link>
      </div>
    );
  }

  const statuses: BookingStatus[] = booking.statuses || [];
  const doneStatuses = statuses.filter(s => s.done);
  const readyStatus = statuses.find(s => s.id === "ready" && s.done);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="text-center space-y-3 pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-card">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Booking Tracking
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Booking #{booking.id.slice(0, 6)}
          </h1>
          <p className="text-muted-foreground">{booking.studioName}</p>
        </div>

        {/* Info Card */}
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<User />} label="Client" value={booking.clientName} />
            <InfoRow icon={<Phone />} label="Phone" value={booking.clientPhone} />
            <InfoRow
              icon={<Calendar />}
              label="Shoot Date"
              value={`${booking.shootDate} ${booking.shootTime || ""}`}
            />
            <InfoRow
              icon={<CreditCard />}
              label="Amount"
              value={`Rs. ${booking.amount?.toLocaleString()}`}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">📋 Booking Progress</h2>

          {/* Done statuses */}
          {doneStatuses.map((status, idx) => (
            <TimelineItem
              key={status.id}
              status={status}
              isLast={idx === doneStatuses.length - 1}
            />
          ))}

          {/* Pending statuses (sirf next ek dikhao) */}
          {statuses
            .filter(s => !s.done)
            .slice(0, 1)
            .map((status) => (
              <PendingItem key={status.id} status={status} />
            ))}
        </div>

        {/* Gallery Link — agar ready ho */}
        {readyStatus?.galleryId && (
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Aapki Photos Ready Hain!</h3>
              <p className="text-sm text-muted-foreground">
                Gallery dekhne ke liye neeche button dabayein
              </p>
            </div>
            <Link href={`/gallery/${readyStatus.galleryId}`}>
              <Button size="lg" className="rounded-full px-8">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Photos
              </Button>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground">
            Koi sawal? Apne photographer se rabta karein.
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ status, isLast }: { status: BookingStatus; isLast: boolean }) {
  return (
    <div className="relative flex gap-4">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-green-200" />
      )}

      {/* Icon */}
      <div className="relative z-10 shrink-0">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 rounded-2xl border bg-card p-4 space-y-1 mb-2">
        <p className="font-bold text-green-700">{status.label}</p>
        {status.message && (
          <p className="text-sm text-muted-foreground">{status.message}</p>
        )}
        {status.at && (
          <p className="text-xs text-muted-foreground">
            {new Date(status.at).toLocaleString("en-PK", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function PendingItem({ status }: { status: BookingStatus }) {
  return (
    <div className="relative flex gap-4 opacity-50">
      <div className="relative z-10 shrink-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Circle className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 rounded-2xl border border-dashed p-4 mb-2">
        <p className="font-bold text-muted-foreground">{status.label}</p>
        <p className="text-xs text-muted-foreground mt-1">Pending...</p>
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