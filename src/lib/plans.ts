/**
 * Hafash Subscription Plan Definitions
 * 4 Plans: Starter, Professional, Business, Enterprise
 * 
 * NOTE: Enterprise plan includes Full Custom Domain,
 * but domain cost (registration + renewal) is paid separately by photographer.
 */

export type PlanId = 'starter' | 'professional' | 'business' | 'enterprise';

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
  domainInfo?: {
    available: boolean;
    cost: string;
    description: string;
    howItWorks: string[];
  };
}

export const HAFASH_PLANS: Record<PlanId, HafashPlan> = {
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
      '📦 Max 200 MB per photo',
      '⬇️ Download All Originals',
      '🎬 Slideshow & Favorites',
      '🔒 Password Protection',
      '⚠️ Hafash Watermark (Forced)',
      '⏰ Gallery Expires in 7 days',
      '👥 Client Download Limit: 50 photos/gallery',
      '❌ No Video Upload',
      '❌ No Photographer\'s Note',
      '❌ No Client Reply',
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
      '📦 Unlimited File Size',
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
      '🎨 Custom Logo on Gallery',
      '📝 Custom Studio Name',
      '🚫 Hafash Logo Hidden',
      '🌐 Custom Subdomain (yourname.hafash.pk)',
      '📊 Basic Analytics (Views, Favorites)',
      '📧 Priority Email Support (12 hours)',
    ],
    priorityLevel: 3,
    priorityLabel: 'Premium',
    driveEnabled: true,
    customBranding: true,
    customSubdomain: true,
    customDomain: false,
    whiteLabel: false,
    maxFolderDepth: 8,
    maxFileSizeGb: 10,
    supportLevel: 'Priority Email',
    supportResponseTime: '12 hours',
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
      '🌐 Full Custom Domain (ahmedphotography.com)',
      '⚪ White Label (Complete Hafash Removal)',
      '📊 Advanced Analytics',
      '📧 Priority Email + Call Support (6 hours)',
      '👤 Dedicated Account Manager',
      '',
      '═══════════════════════════════',
      '🌐 CUSTOM DOMAIN — DETAILS',
      '═══════════════════════════════',
      '📌 Domain registration INCLUDED',
      '💰 Domain cost is paid SEPARATELY (yearly)',
      '📅 Domain renewed every year',
      '💵 Yearly domain fee: Rs. 3,000-5,000',
      '🔧 Domain setup handled by Hafash',
      '✅ Photographer only pays domain cost',
      '⚠️ Domain cost depends on TLD (.com, .pk, etc.)',
    ],
    priorityLevel: 4,
    priorityLabel: 'Enterprise',
    driveEnabled: true,
    customBranding: true,
    customSubdomain: true,
    customDomain: true,
    whiteLabel: true,
    maxFolderDepth: 15,
    maxFileSizeGb: 25,
    supportLevel: 'Priority Email + Call',
    supportResponseTime: '6 hours',
    domainInfo: {
      available: true,
      cost: 'Rs. 3,000 - Rs. 5,000 / year',
      description: 'Full custom domain (ahmedphotography.com) included. Domain cost is paid separately by photographer.',
      howItWorks: [
        '1. Photographer Enterprise Plan leta hai (Rs. 3,500/month)',
        '2. Hafash Settings → Custom Domain khole',
        '3. Apna domain type kare (ahmedphotography.com)',
        '4. Hafash availability check kare',
        '5. Photographer domain cost pay kare (yearly)',
        '6. Hafash domain register kare',
        '7. DNS + SSL automatically setup ho',
        '8. 5 minute mein live! ahmedphotography.com',
        '',
        '💰 Domain Cost (Yearly):',
        '• .com domain: Rs. 3,000-4,000/year',
        '• .pk domain: Rs. 3,000-5,000/year',
        '• .photography: Rs. 4,000-5,000/year',
        '',
        '⚠️ Yeh cost Hafash ka nahi — domain registrar ka hai.',
        '📅 Har saal domain renewal fee deni hogi.',
        '✅ Photographer domain ka owner hoga.',
        '🔧 Setup + DNS + SSL — Hafash handle karega.',
      ],
    },
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
    'Full Custom Domain',
    'White Label',
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

/**
 * Calculates total storage usage across all galleries.
 */
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

/**
 * Hafash Drive ke saath total usage
 */
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