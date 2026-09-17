/**
 * Hafash — Notifications System
 * Types, helpers, and formatters for the notification center.
 */

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TYPES
// ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_request'         // Kisi ne aapko cross request bheji
  | 'request_accepted'    // Aapki request accept hui
  | 'request_declined'    // Aapki request decline hui
  | 'request_cancelled'   // Client ne request cancel ki
  | 'new_message'         // Naya chat message
  | 'new_review'          // Naya review mila
  | 'marked_complete'     // Kisi ne event complete mark kiya
  | 'location_message'    // Location owner ne message bheja
  | 'location_booked';    // Location booking confirm hui

export interface NotificationData {
  id: string;
  userId: string;         // Jisko notification jaa rahi hai
  type: NotificationType;
  title: string;
  body: string;
  link: string;           // Click karne par kahan jaye
  actorId?: string;       // Kisne kiya
  actorName?: string;
  read: boolean;
  createdAt: any;
}

// ─────────────────────────────────────────────────────────────
// TYPE → ICON + COLOR
// ─────────────────────────────────────────────────────────────

export interface NotificationStyle {
  emoji: string;
  icon: string;      // Lucide icon name
  color: string;     // Tailwind color
  bgColor: string;   // Background color
}

export const NOTIFICATION_STYLES: Record<NotificationType, NotificationStyle> = {
  new_request: {
    emoji: '🔔',
    icon: 'Bell',
    color: 'text-primary',
    bgColor: 'bg-primary/15',
  },
  request_accepted: {
    emoji: '✅',
    icon: 'Check',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
  },
  request_declined: {
    emoji: '❌',
    icon: 'X',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
  },
  request_cancelled: {
    emoji: '🚫',
    icon: 'XCircle',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
  },
  new_message: {
    emoji: '💬',
    icon: 'MessageSquare',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/15',
  },
  new_review: {
    emoji: '⭐',
    icon: 'Star',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
  },
  marked_complete: {
    emoji: '✔️',
    icon: 'CheckCircle2',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  location_message: {
    emoji: '📍',
    icon: 'MapPin',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  location_booked: {
    emoji: '📅',
    icon: 'CalendarDays',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
};

// ─────────────────────────────────────────────────────────────
// TIME FORMATTER (relative time)
// ─────────────────────────────────────────────────────────────

export function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return '';

  let date: Date;
  try {
    date = timestamp?.toDate?.() || new Date(timestamp);
  } catch {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${diffDay >= 14 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION MESSAGE HELPERS
// ─────────────────────────────────────────────────────────────

export function buildRequestNotification(actorName: string, eventType: string): {
  title: string;
  body: string;
} {
  return {
    title: '🔔 Naya Cross Request',
    body: `${actorName} ne aapko ${eventType} ke liye request bheji hai`,
  };
}

export function buildAcceptNotification(actorName: string, eventType: string): {
  title: string;
  body: string;
} {
  return {
    title: '✅ Request Accept Ho Gayi',
    body: `${actorName} ne aapki ${eventType} wali request accept kar li hai`,
  };
}

export function buildDeclineNotification(actorName: string, eventType: string): {
  title: string;
  body: string;
} {
  return {
    title: 'Request Decline Hui',
    body: `${actorName} ne aapki ${eventType} wali request decline kar di hai`,
  };
}

export function buildMessageNotification(actorName: string, message: string): {
  title: string;
  body: string;
} {
  return {
    title: `💬 ${actorName} ne message bheja`,
    body: message.length > 80 ? message.slice(0, 80) + '...' : message,
  };
}

export function buildReviewNotification(actorName: string, stars: number): {
  title: string;
  body: string;
} {
  return {
    title: `⭐ ${actorName} ne aapko ${stars} star diya`,
    body: 'Dekhne ke liye tap karein',
  };
}