/**
 * Hafash Subscription Plan Definitions
 * 5 Plans: Trial, Starter, Professional, Business, Enterprise
 */

export type PlanId = 'trial' | 'starter' | 'professional' | 'business' | 'enterprise';

export interface HafashPlan {
  id: PlanId | 'none';
  name: string;
  storageGb: number;
  zipLimitGb: number;
  price: string;
  priceAmount: number;
  yearlyPrice: string;
  yearlyPriceAmount: number;
  features: string[];
  priorityLevel: number;
  priorityLabel: string;
  driveEnabled: boolean;
  customBranding: boolean;
  customSubdomain: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  maxFolderDepth: number;
  maxFileSizeGb: number;
  supportLevel: string;
  supportResponseTime: string;
  isTrial?: boolean;
  trialDays?: number;
  maxGalleries?: number;
  galleryExpiryDays?: number;
  watermark?: boolean;
  analytics?: 'none' | 'basic' | 'advanced';
  videoQuality?: 'none' | 'hd' | '4k';
  domainInfo?: {
    available: boolean;
    cost: string;
    description: string;
    howItWorks: string[];
  };
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    storageGb: 5,
    zipLimitGb: 999,
    price: 'Free',
    priceAmount: 0,
    yearlyPrice: 'Free',
    yearlyPriceAmount: 0,
    features: [
      '🎁 3-Day Free Trial',
      '📁 5GB Hafash Drive Storage',
      '🖼️ 1 Gallery Only',
      '📸 Max 500 Photos',
      '⬇️ Download All Originals',
      '⚠️ Hafash Watermark (Forced)',
      '⏰ Gallery Expires in 3 days',
      '📦 Max 1 GB per photo',
      '❌ No Custom Branding',
      '❌ No Video Upload',
      '❌ No Photographer\'s Note',
      '❌ No Analytics',
      '📧 Email Support',
    ],
    priorityLevel: 0,
    priorityLabel: 'Trial',
    driveEnabled: false,
    customBranding: false,
    customSubdomain: false,
    customDomain: false,
    whiteLabel: false,
    maxFolderDepth: 1,
    maxFileSizeGb: 1,
    supportLevel: 'Email',
    supportResponseTime: '48 hours',
    isTrial: true,
    trialDays: 3,
    maxGalleries: 1,
    galleryExpiryDays: 3,
    watermark: true,
    analytics: 'none',
    videoQuality: 'none',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    storageGb: 20,
    zipLimitGb: 999,
    price: 'Rs. 499',
    priceAmount: 499,
    yearlyPrice: 'Rs. 5,400',
    yearlyPriceAmount: 5400,
    features: [
      '📁 20GB Hafash Drive Storage',
      '🖼️ Max 5 Galleries per month',
      '📸 Max 500 Photos per gallery',
      '📦 Max 1 GB per photo',
      '⬇️ Download All Originals',
      '🎬 Slideshow & Favorites',
      '🔒 Password Protection',
      '✨ No Watermark',
      '⏰ Gallery Expires in 7 days',
      '👥 Client Download Limit: 50 photos/gallery',
      '❌ No Video Upload',
      '❌ No Photographer\'s Note',
      '❌ No Client Reply',
      '❌ No Analytics',
      '📧 Email Support (48 hours)',
    ],
    priorityLevel: 1,
    priorityLabel: 'Standard',
    driveEnabled: true,
    customBranding: false,
    customSubdomain: false,
    customDomain: false,
    whiteLabel: false,
    maxFolderDepth: 3,
    maxFileSizeGb: 1,
    supportLevel: 'Email',
    supportResponseTime: '48 hours',
    watermark: false,
    analytics: 'none',
    videoQuality: 'none',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    storageGb: 50,
    zipLimitGb: 999,
    price: 'Rs. 999',
    priceAmount: 999,
    yearlyPrice: 'Rs. 10,800',
    yearlyPriceAmount: 10800,
    features: [
      '📁 50GB Hafash Drive Storage',
      '🖼️ Unlimited Galleries',
      '📸 Unlimited Photos per gallery',
      '📦 Max 5 GB per photo',
      '🎥 Video Upload (HD)',
      '✨ No Watermark',
      '⏰ Galleries Never Expire',
      '👥 Unlimited Client Downloads',
      '✍️ Photographer\'s Note',
      '💬 Client Reply',
      '🎵 Background Music',
      '📂 Full Hafash Drive Access',
      '🖼️ Create Gallery from Drive',
      '📧 Email Support (24 hours)',
    ],
    priorityLevel: 2,
    priorityLabel: 'Priority',
    driveEnabled: true,
    customBranding: false,
    customSubdomain: false,
    customDomain: false,
    whiteLabel: false,
    maxFolderDepth: 5,
    maxFileSizeGb: 5,
    supportLevel: 'Email',
    supportResponseTime: '24 hours',
    watermark: false,
    analytics: 'none',
    videoQuality: 'hd',
  },
  business: {
    id: 'business',
    name: 'Business',
    storageGb: 100,
    zipLimitGb: 999,
    price: 'Rs. 1,999',
    priceAmount: 1999,
    yearlyPrice: 'Rs. 21,600',
    yearlyPriceAmount: 21600,
    features: [
      '📁 100GB Hafash Drive Storage',
      '✅ Everything in Professional',
      '📦 Max 10 GB per photo',
      '🎥 Video Upload (HD)',
      '📊 Basic Analytics (Views, Favorites, Downloads)',
      '📧 Priority Email Support (12 hours)',
    ],
    priorityLevel: 3,
    priorityLabel: 'Premium',
    driveEnabled: true,
    customBranding: false,
    customSubdomain: false,
    customDomain: false,
    whiteLabel: false,
    maxFolderDepth: 8,
    maxFileSizeGb: 10,
    supportLevel: 'Priority Email',
    supportResponseTime: '12 hours',
    watermark: false,
    analytics: 'basic',
    videoQuality: 'hd',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    storageGb: 200,
    zipLimitGb: 9999,
    price: 'Rs. 3,500',
    priceAmount: 3500,
    yearlyPrice: 'Rs. 38,000',
    yearlyPriceAmount: 38000,
    features: [
      '📁 200GB Hafash Drive Storage',
      '✅ Everything in Business',
      '📦 Max 25 GB per photo',
      '🎥 Video Upload (4K)',
      '🎨 Custom Branding (Logo + Studio Name)',
      '⚪ White Label (Complete Hafash Removal)',
      '🌐 Custom Subdomain (yourname.hafash.pk)',
      '📊 Advanced Analytics (Charts, Traffic, Geographic)',
      '📧 Priority Email + Call Support (6 hours)',
    ],
    priorityLevel: 4,
    priorityLabel: 'Enterprise',
    driveEnabled: true,
    customBranding: true,
    customSubdomain: true,
    customDomain: false,
    whiteLabel: true,
    maxFolderDepth: 15,
    maxFileSizeGb: 25,
    supportLevel: 'Priority Email + Call',
    supportResponseTime: '6 hours',
    watermark: false,
    analytics: 'advanced',
    videoQuality: '4k',
  },
};

export const NO_PLAN: HafashPlan = {
  id: 'none',
  name: 'No Active Plan',
  storageGb: 0,
  zipLimitGb: 0,
  price: 'Rs. 0',
  priceAmount: 0,
  yearlyPrice: 'Rs. 0',
  yearlyPriceAmount: 0,
  features: [],
  priorityLevel: 0,
  priorityLabel: 'None',
  driveEnabled: false,
  customBranding: false,
  customSubdomain: false,
  customDomain: false,
  whiteLabel: false,
  maxFolderDepth: 0,
  maxFileSizeGb: 0,
  supportLevel: 'None',
  supportResponseTime: 'N/A',
  analytics: 'none',
  videoQuality: 'none',
};

export const DEFAULT_PLAN = NO_PLAN;

export const OWNER_EMAILS: string[] = [
  'hafashgroup60@gmail.com',
];

export const OWNER_PLAN: HafashPlan = {
  id: 'enterprise',
  name: 'Owner (Unlimited)',
  storageGb: 999999,
  zipLimitGb: 999999,
  price: 'Rs. 0',
  priceAmount: 0,
  yearlyPrice: 'Rs. 0',
  yearlyPriceAmount: 0,
  features: [
    'Unlimited Storage',
    'Unlimited Drive',
    'All Features Unlocked',
    'Custom Branding',
    'Custom Subdomain',
    'Full Custom Domain',
    'White Label',
    'Advanced Analytics',
    '4K Video',
    'Priority Processing',
    'Owner Account',
  ],
  priorityLevel: 999,
  priorityLabel: 'Owner',
  driveEnabled: true,
  customBranding: true,
  customSubdomain: true,
  customDomain: true,
  whiteLabel: true,
  maxFolderDepth: 999,
  maxFileSizeGb: 999,
  supportLevel: 'Owner',
  supportResponseTime: 'N/A',
  analytics: 'advanced',
  videoQuality: '4k',
};

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
}

export function getUserPlan(planId?: string | null, email?: string | null): HafashPlan {
  if (isOwnerEmail(email)) return OWNER_PLAN;
  if (!planId) return NO_PLAN;
  if (planId in HAFASH_PLANS) return HAFASH_PLANS[planId as PlanId];
  return NO_PLAN;
}

export function isTrialExpired(trialExpiry?: string | Date | null): boolean {
  if (!trialExpiry) return false;
  const expiry = typeof trialExpiry === 'string' ? new Date(trialExpiry) : trialExpiry;
  return new Date() > expiry;
}

export function getTrialDaysRemaining(trialExpiry?: string | Date | null): number {
  if (!trialExpiry) return 0;
  const expiry = typeof trialExpiry === 'string' ? new Date(trialExpiry) : trialExpiry;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getTrialHoursRemaining(trialExpiry?: string | Date | null): number {
  if (!trialExpiry) return 0;
  const expiry = typeof trialExpiry === 'string' ? new Date(trialExpiry) : trialExpiry;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function calculateUsageGb(galleries: any[] | null): number {
  if (!galleries || !Array.isArray(galleries)) return 0;

  let totalBytes = 0;

  galleries.forEach(g => {
    if ((!g.items || g.items.length === 0) && g.photoCount > 0) {
      totalBytes += g.photoCount * 6.5 * 1024 * 1024;
      return;
    }

    const items = Array.isArray(g.items) ? g.items : [];
    items.forEach((item: any) => {
      const previewSize = Number(item.fileSize) || 0;
      const thumbSize = item.thumbKey ? (50 * 1024) : 0;
      let originalSize = 0;
      if (item.originalReady) {
        if (item.originalSize && Number(item.originalSize) > 0) {
          originalSize = Number(item.originalSize);
        } else {
          originalSize = previewSize * 10;
        }
      }
      const itemTotal = previewSize + thumbSize + originalSize;
      totalBytes += itemTotal > 0 ? itemTotal : (3 * 1024 * 1024);
    });
  });

  return totalBytes / (1024 * 1024 * 1024);
}

export function calculateTotalUsageGb(
  galleries: any[] | null,
  driveItems: any[] | null
): number {
  const galleryUsage = calculateUsageGb(galleries);
  
  if (!driveItems || !Array.isArray(driveItems)) return galleryUsage;
  
  let driveBytes = 0;
  driveItems.forEach(item => {
    driveBytes += Number(item.fileSize) || 0;
  });
  
  return galleryUsage + (driveBytes / (1024 * 1024 * 1024));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function calculateUsageMb(galleries: any[] | null): number {
  return calculateUsageGb(galleries) * 1024;
}