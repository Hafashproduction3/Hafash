/**
 * Hafash — Profile Completion Calculator
 * Calculates how complete a professional's profile is (0-100%)
 */

export interface ProfileCompletionInput {
    gender?: string;
    roles?: string[];
    bio?: string;
    baseCity?: string;
    serviceAreas?: string[];
    equipment?: any[];
    rates?: any[];
    rates_legacy?: any;
    portfolioType?: string;
    portfolioGalleryIds?: string[];
    instagramLink?: string;
    facebookLink?: string;
    youtubeLink?: string;
    turnarounds?: Record<string, string>;
    availability?: Record<string, string>;
    travelRange?: string;
  }
  
  export interface CompletionItem {
    id: string;
    label: string;
    description: string;
    weight: number;   // Points this item contributes
    done: boolean;
    priority: 'high' | 'medium' | 'low';
  }
  
  export interface ProfileCompletionResult {
    percent: number;      // 0-100
    completed: number;    // Total points earned
    total: number;        // Total possible points
    items: CompletionItem[];
    missingHigh: CompletionItem[];
    nextStep: CompletionItem | null;
  }
  
  export function calculateProfileCompletion(input: ProfileCompletionInput): ProfileCompletionResult {
    const roles: string[] = input.roles || [];
    const isOnSite = roles.some((r) =>
      ['photographer', 'videographer', 'drone_operator', 'camera_operator', 'helper', 'makeup_artist'].includes(r)
    );
    const isRemote = roles.some((r) =>
      ['video_editor', 'photo_editor', 'album_designer'].includes(r)
    );
  
    const hasRates =
      (Array.isArray(input.rates) && input.rates.length > 0) ||
      !!input.rates_legacy?.amount;
  
    const hasPortfolio =
      (input.portfolioType === 'hafash_gallery' &&
        (input.portfolioGalleryIds?.length || 0) > 0) ||
      !!input.instagramLink ||
      !!input.facebookLink ||
      !!input.youtubeLink;
  
    const hasEquipment = (input.equipment?.length || 0) > 0;
    const hasAreas = (input.serviceAreas?.length || 0) > 0;
    const hasTurnarounds =
      isRemote && input.turnarounds && Object.keys(input.turnarounds).length > 0;
    const hasAvailability =
      isOnSite && input.availability && Object.keys(input.availability).length > 0;
  
    const items: CompletionItem[] = [
      {
        id: 'gender',
        label: 'Gender set',
        description: 'Male ya Female select karein',
        weight: 10,
        done: !!input.gender,
        priority: 'high',
      },
      {
        id: 'roles',
        label: 'Roles selected',
        description: 'Kam az kam ek role chunein',
        weight: 15,
        done: roles.length > 0,
        priority: 'high',
      },
      {
        id: 'bio',
        label: 'Short bio',
        description: 'Apna taaruf likhein (min 50 characters)',
        weight: 10,
        done: (input.bio || '').trim().length >= 50,
        priority: 'high',
      },
      {
        id: 'rates',
        label: 'Rate card',
        description: 'Apni rates add karein',
        weight: 15,
        done: hasRates,
        priority: 'high',
      },
      {
        id: 'portfolio',
        label: 'Portfolio',
        description: 'Galleries ya social links add karein',
        weight: 15,
        done: hasPortfolio,
        priority: 'high',
      },
      {
        id: 'city',
        label: 'City set',
        description: 'Apna base city batayein',
        weight: 8,
        done: isOnSite ? !!input.baseCity : true,
        priority: 'medium',
      },
      {
        id: 'equipment',
        label: 'Equipment list',
        description: 'Kam az kam ek equipment add karein',
        weight: 8,
        done: isOnSite ? hasEquipment : true,
        priority: 'medium',
      },
      {
        id: 'areas',
        label: 'Service areas',
        description: 'Kahan kaam karte hain',
        weight: 7,
        done: isOnSite ? hasAreas : true,
        priority: 'medium',
      },
      {
        id: 'turnarounds',
        label: 'Delivery time',
        description: 'Kaam kitne din mein deliver karenge',
        weight: 8,
        done: isRemote ? !!hasTurnarounds : true,
        priority: 'medium',
      },
      {
        id: 'availability',
        label: 'Availability set',
        description: 'Apne busy din mark karein',
        weight: 4,
        done: isOnSite ? !!hasAvailability : true,
        priority: 'low',
      },
    ];
  
    // Filter out items that don't apply to this role
    const applicableItems = items.filter((item) => {
      if (!isOnSite && (item.id === 'city' || item.id === 'equipment' || item.id === 'areas' || item.id === 'availability')) {
        return false;
      }
      if (!isRemote && item.id === 'turnarounds') {
        return false;
      }
      return true;
    });
  
    const total = applicableItems.reduce((sum, item) => sum + item.weight, 0);
    const completed = applicableItems.filter((i) => i.done).reduce((sum, i) => sum + i.weight, 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
    const missingHigh = applicableItems.filter((i) => !i.done && i.priority === 'high');
    const nextStep =
      missingHigh[0] ||
      applicableItems.find((i) => !i.done && i.priority === 'medium') ||
      applicableItems.find((i) => !i.done) ||
      null;
  
    return {
      percent,
      completed,
      total,
      items: applicableItems,
      missingHigh,
      nextStep,
    };
  }
  
  export function getCompletionColor(percent: number): string {
    if (percent >= 90) return 'text-emerald-400';
    if (percent >= 70) return 'text-green-400';
    if (percent >= 50) return 'text-yellow-400';
    if (percent >= 30) return 'text-orange-400';
    return 'text-red-400';
  }
  
  export function getCompletionBg(percent: number): string {
    if (percent >= 90) return 'from-emerald-500 to-green-400';
    if (percent >= 70) return 'from-green-500 to-emerald-400';
    if (percent >= 50) return 'from-yellow-500 to-amber-400';
    if (percent >= 30) return 'from-orange-500 to-amber-400';
    return 'from-red-500 to-orange-400';
  }
  
  export function getCompletionLabel(percent: number): string {
    if (percent >= 90) return 'Excellent';
    if (percent >= 70) return 'Good';
    if (percent >= 50) return 'Halfway';
    if (percent >= 30) return 'Getting Started';
    return 'Just Started';
  }