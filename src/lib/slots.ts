/**
 * Hafash.pk — Slot Generation & Availability Logic
 * 
 * Capacity-based time slot system
 * - Owner slot duration set kare (e.g., 2 hours)
 * - Owner capacity set kare (e.g., 5 couples per slot)
 * - Har slot mein X/Y available show ho
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SlotConfig {
    slotDuration: number;        // hours (e.g., 2)
    capacityPerSlot: number;     // e.g., 5
    bufferMinutes?: number;      // optional (e.g., 15)
  }
  
  export interface Slot {
    start: string;               // "14:00"
    end: string;                 // "16:00"
    label: string;               // "2:00 PM - 4:00 PM"
    booked: number;              // 3
    capacity: number;            // 5
    available: number;           // 2
    isFull: boolean;             // false
  }
  
  export interface SlotAvailability {
    [date: string]: {
      [slotKey: string]: {
        booked: number;
        capacity: number;
      };
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GENERATE SLOTS FROM OPENING HOURS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Opening hours se slots generate kare
   * 
   * @example
   * generateSlots({ slotDuration: 2, capacityPerSlot: 5 }, "09:00", "21:00")
   * → [
   *   { start: "09:00", end: "11:00", label: "9:00 AM - 11:00 AM", ... },
   *   { start: "11:00", end: "13:00", label: "11:00 AM - 1:00 PM", ... },
   *   ...
   * ]
   */
  export function generateSlots(
    config: SlotConfig,
    openTime: string,
    closeTime: string
  ): Slot[] {
    const slots: Slot[] = [];
    
    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);
    const slotDurationMinutes = config.slotDuration * 60;
    const bufferMinutes = config.bufferMinutes || 0;
    const totalStep = slotDurationMinutes + bufferMinutes;
  
    let current = openMinutes;
  
    while (current + slotDurationMinutes <= closeMinutes) {
      const start = minutesToTime(current);
      const end = minutesToTime(current + slotDurationMinutes);
  
      slots.push({
        start,
        end,
        label: `${formatTime12h(start)} - ${formatTime12h(end)}`,
        booked: 0,
        capacity: config.capacityPerSlot,
        available: config.capacityPerSlot,
        isFull: false,
      });
  
      current += totalStep;
    }
  
    return slots;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GET SLOTS WITH AVAILABILITY FOR A DATE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Specific date ke liye slots with current availability
   */
  export function getSlotsForDate(
    config: SlotConfig,
    openTime: string,
    closeTime: string,
    date: string,
    availability: SlotAvailability
  ): Slot[] {
    const baseSlots = generateSlots(config, openTime, closeTime);
    const dateAvailability = availability?.[date] || {};
  
    return baseSlots.map((slot) => {
      const slotKey = `${slot.start}-${slot.end}`;
      const bookedData = dateAvailability[slotKey] || { booked: 0 };
      const booked = bookedData.booked || 0;
      const capacity = bookedData.capacity || config.capacityPerSlot;
      const available = Math.max(0, capacity - booked);
  
      return {
        ...slot,
        booked,
        capacity,
        available,
        isFull: available === 0,
      };
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INCREMENT BOOKING COUNT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Slot mein ek booking add kare
   * Firestore update ke liye payload return kare
   */
  export function incrementSlotBooking(
    date: string,
    slotStart: string,
    slotEnd: string,
    currentAvailability: SlotAvailability,
    capacity: number
  ): SlotAvailability {
    const slotKey = `${slotStart}-${slotEnd}`;
    const updated = { ...currentAvailability };
  
    if (!updated[date]) updated[date] = {};
    if (!updated[date][slotKey]) {
      updated[date][slotKey] = { booked: 0, capacity };
    }
  
    updated[date][slotKey] = {
      ...updated[date][slotKey],
      booked: (updated[date][slotKey].booked || 0) + 1,
    };
  
    return updated;
  }
  
  /**
   * Slot se booking remove kare (cancel ke liye)
   */
  export function decrementSlotBooking(
    date: string,
    slotStart: string,
    slotEnd: string,
    currentAvailability: SlotAvailability
  ): SlotAvailability {
    const slotKey = `${slotStart}-${slotEnd}`;
    const updated = { ...currentAvailability };
  
    if (updated[date]?.[slotKey]) {
      updated[date][slotKey] = {
        ...updated[date][slotKey],
        booked: Math.max(0, (updated[date][slotKey].booked || 0) - 1),
      };
    }
  
    return updated;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // TIME HELPERS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * "14:30" → 870 minutes
   */
  export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }
  
  /**
   * 870 → "14:30"
   */
  export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  
  /**
   * "14:30" → "2:30 PM"
   */
  export function formatTime12h(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DATE HELPERS (Timezone-safe)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Local date key (timezone-safe)
   * new Date(2026, 10, 2) → "2026-11-02"
   */
  export function getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DEFAULT CONFIG
  // ═══════════════════════════════════════════════════════════════
  
  export const DEFAULT_SLOT_CONFIG: SlotConfig = {
    slotDuration: 2,
    capacityPerSlot: 5,
    bufferMinutes: 0,
  };
  
  // ═══════════════════════════════════════════════════════════════
  // SLOT DURATION OPTIONS (for UI)
  // ═══════════════════════════════════════════════════════════════
  
  export const SLOT_DURATION_OPTIONS = [
    { value: 1, label: "1 hour" },
    { value: 1.5, label: "1.5 hours" },
    { value: 2, label: "2 hours" },
    { value: 2.5, label: "2.5 hours" },
    { value: 3, label: "3 hours" },
    { value: 4, label: "4 hours" },
  ];
  
  // ═══════════════════════════════════════════════════════════════
  // SHOOT TYPES
  // ═══════════════════════════════════════════════════════════════
  
  export const SHOOT_TYPES = [
    { id: "couple", label: "Couple", emoji: "💑" },
    { id: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
    { id: "bridal", label: "Bridal", emoji: "👰" },
    { id: "solo", label: "Solo", emoji: "🧍" },
    { id: "maternity", label: "Maternity", emoji: "🤰" },
    { id: "newborn", label: "Newborn", emoji: "👶" },
    { id: "fashion", label: "Fashion", emoji: "👗" },
    { id: "product", label: "Product", emoji: "📦" },
  ];