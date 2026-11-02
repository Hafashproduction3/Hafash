// src/lib/admin-types.ts

/**
 * ═══════════════════════════════════════════════════════════════
 * ADMIN PANEL — TYPESCRIPT TYPES
 * ═══════════════════════════════════════════════════════════════
 */

// ═══ Platform Stats (Dashboard ke liye) ═══
export interface PlatformStats {
    totalUsers: number;
    totalPhotographers: number;
    totalLocationOwners: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    totalGalleries: number;
    totalPhotos: number;
    totalStorageGb: number;
    monthlyRevenue: number;
    totalRevenue: number;
    newSignupsToday: number;
    newSignupsThisWeek: number;
    newSignupsThisMonth: number;
    updatedAt: string;
  }
  
  // ═══ User Summary (List ke liye) ═══
  export interface AdminUserSummary {
    userId: string;
    email: string;
    role: 'photographer' | 'location-owner';
    studioName: string;
    photographerName: string;
    subdomain: string;
    city: string;
    whatsappNumber: string;
    planId: string;
    planStatus: 'active' | 'inactive' | 'suspended';
    planExpiryDate: string | null;
    subscriptionStatus: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    galleryCount: number;
    photoCount: number;
    storageUsedGb: number;
  }
  
  // ═══ User Detail (Full info) ═══
  export interface AdminUserDetail extends AdminUserSummary {
    planActivatedAt: string | null;
    planActivatedBy: string | null;
    planDeactivatedAt: string | null;
    planDeactivatedBy: string | null;
    planDeactivationReason: string | null;
    lastPlanChangeBy: string | null;
    planHistory: PlanHistoryEntry[];
    tagline: string;
    instagramLink: string;
    termsAccepted: boolean;
    termsVersion: string;
    termsAcceptedAt: string | null;
  }
  
  // ═══ Plan History ═══
  export interface PlanHistoryEntry {
    action: 'activated' | 'deactivated' | 'extended' | 'changed' | 'expired' | 'renewed';
    planId?: string;
    fromPlan?: string;
    toPlan?: string;
    days?: number;
    reason?: string;
    at: string;
    by: 'admin' | 'safepay' | 'system';
    adminEmail?: string;
  }
  
  // ═══ Plan Change Request ═══
  export interface PlanChangeRequest {
    userId: string;
    newPlanId: 'starter' | 'pro' | 'business' | 'enterprise' | 'none';
    durationDays: number | 'lifetime';
    reason: string;
    notifyUser: boolean;
  }
  
  // ═══ Plan Change Response ═══
  export interface PlanChangeResponse {
    success: boolean;
    message?: string;
    error?: string;
    before?: { planId: string; planExpiryDate: string | null };
    after?: { planId: string; planExpiryDate: string | null };
  }
  
  // ═══ Audit Log Entry ═══
  export interface AuditLogEntry {
    id: string;
    adminId: string;
    adminEmail: string;
    action: string;
    targetType: 'user' | 'gallery' | 'payment' | 'system' | 'review';
    targetId: string;
    targetEmail?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
  }
  
  // ═══ Filter Options ═══
  export interface UserFilterOptions {
    search?: string;
    planId?: string;
    planStatus?: string;
    role?: string;
    city?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'planExpiryDate' | 'storageUsedGb';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }
  
  // ═══ Action Result (Standard) ═══
  export interface ActionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
  }