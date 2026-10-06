// src/lib/booking-status.ts

/**
 * Tracking Status — Photographer control panel ke liye
 * (Purane BookingStatus se alag — jo quote/invoice ke liye hai)
 */
export interface TrackingStatus {
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

export const DEFAULT_STATUSES: TrackingStatus[] = [
  {
    id: "received",
    label: "Booking Received",
    message: "Aapki request mil gayi hai",
    done: true,
    locked: true,
    at: new Date().toISOString(),
    notified: false,
  },
  {
    id: "confirmed",
    label: "Booking Confirmed",
    message: "Photographer ne confirm kar diya",
    done: false,
    locked: false,
    at: null,
    notified: false,
  },
  {
    id: "paid",
    label: "Payment Received",
    message: "Payment received",
    done: false,
    locked: false,
    at: null,
    notified: false,
    proof: null,
  },
  {
    id: "shot",
    label: "Shoot Complete",
    message: "Shoot ho gaya",
    done: false,
    locked: false,
    at: null,
    notified: false,
  },
  {
    id: "ready",
    label: "Photos Ready",
    message: "Aapki photos ready hain",
    done: false,
    locked: false,
    at: null,
    notified: false,
    galleryId: null,
  },
];

export function getCurrentStatus(statuses: TrackingStatus[]): string {
  const lastDone = [...statuses].reverse().find(s => s.done);
  return lastDone?.id || "received";
}