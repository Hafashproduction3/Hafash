/**
 * Hafash Shoot Locations — Types & Constants
 */

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

export type LocationCategory =
  | 'outdoor'
  | 'indoor'
  | 'hotel'
  | 'beach'
  | 'park'
  | 'heritage'
  | 'rooftop'
  | 'villa'
  | 'studio'
  | 'wedding_venue'
  | 'scenic';

export interface LocationCategoryInfo {
  id: LocationCategory;
  label: string;
  emoji: string;
  description: string;
}

export const LOCATION_CATEGORIES: LocationCategoryInfo[] = [
  { id: 'outdoor',       label: 'Outdoor',           emoji: '🌿', description: 'Open-air natural spaces' },
  { id: 'indoor',        label: 'Indoor',            emoji: '🏛️', description: 'Covered indoor setups' },
  { id: 'studio',        label: 'Studio',            emoji: '🎬', description: 'Professional photography studios' },
  { id: 'villa',         label: 'Private Villa',     emoji: '🏡', description: 'Private homes and villas' },
  { id: 'hotel',         label: 'Hotel',             emoji: '🏨', description: 'Hotel properties' },
  { id: 'beach',         label: 'Beach',             emoji: '🌊', description: 'Beachfront locations' },
  { id: 'park',          label: 'Park / Garden',     emoji: '🌳', description: 'Parks and gardens' },
  { id: 'heritage',      label: 'Historical',        emoji: '🏰', description: 'Historical & heritage sites' },
  { id: 'rooftop',       label: 'Rooftop / Urban',   emoji: '🏙️', description: 'Rooftops and urban spots' },
  { id: 'wedding_venue', label: 'Wedding Venue',     emoji: '💍', description: 'Wedding halls and venues' },
  { id: 'scenic',        label: 'Scenic / Sunset',   emoji: '🌅', description: 'Scenic and sunset spots' },
];

export function getCategoryInfo(id: string): LocationCategoryInfo | null {
  return LOCATION_CATEGORIES.find((c) => c.id === id) || null;
}

// ─────────────────────────────────────────────────────────────
// AMENITIES
// ─────────────────────────────────────────────────────────────

export interface AmenityInfo {
  id: string;
  label: string;
  emoji: string;
}

export const AMENITIES: AmenityInfo[] = [
  { id: 'changing_room',  label: 'Changing Room',       emoji: '👗' },
  { id: 'makeup_room',    label: 'Makeup Room',         emoji: '💄' },
  { id: 'parking',        label: 'Parking',             emoji: '🅿️' },
  { id: 'electricity',    label: 'Electricity',         emoji: '⚡' },
  { id: 'ac',             label: 'Air Conditioning',    emoji: '❄️' },
  { id: 'backdrops',      label: 'Backdrops',           emoji: '🖼️' },
  { id: 'lighting',       label: 'Lighting Available',  emoji: '💡' },
  { id: 'restroom',       label: 'Restroom',            emoji: '🚻' },
  { id: 'water',          label: 'Drinking Water',      emoji: '💧' },
  { id: 'wifi',           label: 'WiFi',                emoji: '📶' },
  { id: 'sound_system',   label: 'Sound System',        emoji: '🔊' },
  { id: 'food',           label: 'Food Available',      emoji: '🍽️' },
];

// ─────────────────────────────────────────────────────────────
// TIME SLOTS
// ─────────────────────────────────────────────────────────────

export interface BookedSlot {
  start: string;   // "14:00" (24-hour format)
  end: string;     // "17:00"
  bookedBy?: string;
  bookedAt?: any;
  status?: 'pending' | 'confirmed';
}

export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Check if a given time range overlaps with any booked slot.
 */
export function isTimeSlotBooked(
  bookedSlots: BookedSlot[] | undefined,
  checkStart: string,
  checkEnd: string
): boolean {
  if (!bookedSlots || bookedSlots.length === 0) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const checkS = toMinutes(checkStart);
  const checkE = toMinutes(checkEnd);

  return bookedSlots.some((slot) => {
    const sS = toMinutes(slot.start);
    const sE = toMinutes(slot.end);
    // Overlap condition
    return checkS < sE && checkE > sS;
  });
}

/**
 * Get all booked slots for a specific date.
 */
export function getSlotsForDate(
  bookedSlots: Record<string, BookedSlot[]> | undefined,
  dateKey: string
): BookedSlot[] {
  if (!bookedSlots) return [];
  return bookedSlots[dateKey] || [];
}

// ─────────────────────────────────────────────────────────────
// PAYMENT DETAILS (Owner shares with photographer)
// ─────────────────────────────────────────────────────────────

export interface PaymentDetails {
  easypaisa?: string;
  jazzcash?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  preferredMethod?: 'easypaisa' | 'jazzcash' | 'bank' | 'cash';
  additionalNote?: string;
}

// ─────────────────────────────────────────────────────────────
// PACKAGES (Future feature — not in Phase 1)
// ─────────────────────────────────────────────────────────────

export interface ShootPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  includes: string[];
}

// ─────────────────────────────────────────────────────────────
// CATEGORY LABEL HELPER
// ─────────────────────────────────────────────────────────────

export function getCategoryLabel(id: string): string {
  const info = getCategoryInfo(id);
  return info ? `${info.emoji} ${info.label}` : id;
}

// ─────────────────────────────────────────────────────────────
// TIME SLOT PRESETS (for owner form)
// ─────────────────────────────────────────────────────────────

export const OPENING_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export function formatTime12h(time24: string): string {
  try {
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h = h - 12;
    return `${h}:${m} ${period}`;
  } catch {
    return time24;
  }
}

// ─────────────────────────────────────────────────────────────
// IMAGE COMPRESSION (client-side)
// ─────────────────────────────────────────────────────────────

/**
 * Compress an image file client-side.
 * Location photos don't need full resolution — 1200px max is plenty.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if wider than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
    };

    reader.onerror = () => reject(new Error('File read failed'));
  });
}