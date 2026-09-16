/**
 * Hafash Trust Score & Achievements System
 * Calculates a 0-100 trust score and unlocks achievement badges.
 */

export interface TrustScoreInput {
    ratingAverage: number;   // 0-5
    ratingCount: number;     // total reviews
    completedJobs: number;   // total completed events
    isVerified: boolean;
    punctualityAvg?: number;
    behaviorAvg?: number;
    workQualityAvg?: number;
    communicationAvg?: number;
  }
  
  export interface TrustScoreResult {
    score: number;           // 0-100
    level: 'new' | 'rising' | 'trusted' | 'excellent' | 'elite';
    label: string;
    color: string;           // for UI
  }
  
  export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
    const {
      ratingAverage,
      ratingCount,
      completedJobs,
      isVerified,
    } = input;
  
    // Component 1: Rating (max 60 points)
    // 5.0 rating = 60 points, 3.0 rating = 36 points
    const ratingPoints = Math.min((ratingAverage / 5) * 60, 60);
  
    // Component 2: Review count (max 20 points)
    // 20 reviews = 20 points (capped)
    const reviewPoints = Math.min((ratingCount / 20) * 20, 20);
  
    // Component 3: Completed jobs (max 15 points)
    // 30 events = 15 points (capped)
    const jobPoints = Math.min((completedJobs / 30) * 15, 15);
  
    // Component 4: Verification (5 points)
    const verifiedPoints = isVerified ? 5 : 0;
  
    const total = ratingPoints + reviewPoints + jobPoints + verifiedPoints;
  
    let score = Math.round(total);
    if (score > 100) score = 100;
    if (score < 0) score = 0;
  
    // If no reviews yet — cap the score at 20 (new profile)
    if (ratingCount === 0) {
      score = Math.min(score, 20);
    }
  
    // Determine level
    let level: TrustScoreResult['level'];
    let label: string;
    let color: string;
  
    if (score >= 85) {
      level = 'elite';
      label = 'Elite Professional';
      color = 'text-purple-400';
    } else if (score >= 70) {
      level = 'excellent';
      label = 'Excellent';
      color = 'text-emerald-400';
    } else if (score >= 50) {
      level = 'trusted';
      label = 'Trusted';
      color = 'text-blue-400';
    } else if (score >= 25) {
      level = 'rising';
      label = 'Rising Star';
      color = 'text-yellow-400';
    } else {
      level = 'new';
      label = 'New Member';
      color = 'text-muted-foreground';
    }
  
    return { score, level, label, color };
  }
  
  // ─────────────────────────────────────────────────────────────
  // Achievement Badges
  // ─────────────────────────────────────────────────────────────
  
  export interface Achievement {
    id: string;
    icon: string;         // emoji
    label: string;
    description: string;
    color: string;        // tailwind color
  }
  
  export interface AchievementInput {
    ratingAverage: number;
    ratingCount: number;
    completedJobs: number;
    isVerified: boolean;
    trustScore: number;
  }
  
  export function getAchievements(input: AchievementInput): Achievement[] {
    const {
      ratingAverage,
      ratingCount,
      completedJobs,
      isVerified,
      trustScore,
    } = input;
  
    const unlocked: Achievement[] = [];
  
    // Top Rated — 4.5+ rating with 10+ reviews
    if (ratingAverage >= 4.5 && ratingCount >= 10) {
      unlocked.push({
        id: 'top_rated',
        icon: '🏆',
        label: 'Top Rated',
        description: 'Maintained 4.5+ rating with 10+ reviews',
        color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40',
      });
    }
  
    // Rising Star — 3+ reviews, less than 10, rating 4.0+
    if (ratingCount >= 3 && ratingCount < 10 && ratingAverage >= 4.0) {
      unlocked.push({
        id: 'rising_star',
        icon: '🌟',
        label: 'Rising Star',
        description: 'New but already making waves',
        color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40',
      });
    }
  
    // Trusted Pro — Trust score 80+
    if (trustScore >= 80) {
      unlocked.push({
        id: 'trusted_pro',
        icon: '💎',
        label: 'Trusted Pro',
        description: 'Top 20% of Hafash professionals',
        color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40',
      });
    }
  
    // Prolific — 50+ completed events
    if (completedJobs >= 50) {
      unlocked.push({
        id: 'prolific',
        icon: '🎯',
        label: 'Prolific',
        description: '50+ events successfully delivered',
        color: 'from-orange-500/20 to-red-500/10 border-orange-500/40',
      });
    } else if (completedJobs >= 10) {
      // Experienced — 10+ events
      unlocked.push({
        id: 'experienced',
        icon: '⚡',
        label: 'Experienced',
        description: '10+ events completed on Hafash',
        color: 'from-green-500/20 to-emerald-500/10 border-green-500/40',
      });
    }
  
    // Verified — verified badge
    if (isVerified) {
      unlocked.push({
        id: 'verified',
        icon: '✅',
        label: 'Verified',
        description: 'Identity verified by Hafash team',
        color: 'from-primary/20 to-primary/5 border-primary/40',
      });
    }
  
    // 5-Star Streak — perfect rating with 5+ reviews
    if (ratingAverage === 5.0 && ratingCount >= 5) {
      unlocked.push({
        id: 'five_star',
        icon: '⭐',
        label: '5-Star Streak',
        description: 'Perfect 5.0 rating maintained',
        color: 'from-yellow-400/20 to-yellow-600/10 border-yellow-400/40',
      });
    }
  
    // Century Club — 100+ events
    if (completedJobs >= 100) {
      unlocked.push({
        id: 'century',
        icon: '👑',
        label: 'Century Club',
        description: '100+ events — legendary status',
        color: 'from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/40',
      });
    }
  
    return unlocked;
  }
  
  // ─────────────────────────────────────────────────────────────
  // Verified status check
  // ─────────────────────────────────────────────────────────────
  
  export function isVerifiedPro(
    ratingAverage: number,
    ratingCount: number,
    trustScore: number
  ): boolean {
    // Verified if: 5+ reviews, 4+ rating, trust score 60+
    return ratingCount >= 5 && ratingAverage >= 4.0 && trustScore >= 60;
  }
  
  // ─────────────────────────────────────────────────────────────
  // Response time formatting (placeholder for future)
  // ─────────────────────────────────────────────────────────────
  
  export function formatResponseTime(minutes: number): string {
    if (minutes < 60) return `~${Math.round(minutes)}m`;
    if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
    return `~${Math.round(minutes / 1440)}d`;
  }
  
  // ─────────────────────────────────────────────────────────────
  // Member since — human readable
  // ─────────────────────────────────────────────────────────────
  
  export function getMemberDuration(createdAt: any): string {
    if (!createdAt) return '—';
    try {
      const start = createdAt?.toDate?.() || new Date(createdAt);
      const now = new Date();
      const months =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());
      if (months < 1) return 'New';
      if (months < 12) return `${months} mo`;
      const years = Math.floor(months / 12);
      return `${years} yr`;
    } catch {
      return '—';
    }
  }