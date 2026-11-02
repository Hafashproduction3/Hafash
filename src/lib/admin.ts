// src/lib/admin.ts

/**
 * ═══════════════════════════════════════════════════════════════
 * HAFASH ADMIN CONFIGURATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Yahan admin emails aur roles define hote hain.
 * Naya admin add karna ho toh sirf is file ko edit karein.
 *
 * ⚠️ IMPORTANT: Admin authentication SIRF server-side check se hoti hai.
 * Client-side flags pe kabhi bharosa na karein.
 */

// ═══ Super Admin Emails (Full access) ═══
export const SUPER_ADMIN_EMAILS = [
    'hafashgroup60@gmail.com',
    // Future admins yahan add karein
  ];
  
  // ═══ Admin Roles ═══
  export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'analyst';
  
  // ═══ Admin Info Structure ═══
  export interface AdminInfo {
    email: string;
    role: AdminRole;
    name: string;
  }
  
  // ═══ Admin Registry ═══
  export const ADMIN_REGISTRY: Record<string, AdminInfo> = {
    'hafashgroup60@gmail.com': {
      email: 'hafashgroup60@gmail.com',
      role: 'super_admin',
      name: 'Hafash Owner',
    },
  };
  
  /**
   * Check karein ke email admin hai ya nahi
   */
  export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalized);
  }
  
  /**
   * Admin ka role get karein
   */
  export function getAdminRole(email: string | null | undefined): AdminRole | null {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    const admin = ADMIN_REGISTRY[normalized];
    return admin?.role || null;
  }
  
  /**
   * Admin info get karein
   */
  export function getAdminInfo(email: string | null | undefined): AdminInfo | null {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    return ADMIN_REGISTRY[normalized] || null;
  }
  
  /**
   * Role check — specific permission ke liye
   */
  export function canAccess(role: AdminRole | null, feature: string): boolean {
    if (!role) return false;
    if (role === 'super_admin') return true;
  
    const permissions: Record<AdminRole, string[]> = {
      super_admin: ['*'],
      admin: [
        'users.read', 'users.write', 'galleries.read', 'galleries.write',
        'payments.read', 'audit.read', 'crons.read', 'crons.trigger',
      ],
      moderator: ['users.read', 'galleries.read', 'reviews.write', 'audit.read'],
      support: ['users.read', 'galleries.read', 'impersonate'],
      analyst: ['users.read', 'galleries.read', 'payments.read', 'audit.read'],
    };
  
    return permissions[role].includes('*') || permissions[role].includes(feature);
  }