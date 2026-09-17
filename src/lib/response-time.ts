/**
 * Hafash — Response Time Calculator
 * Calculates average response time from accepted requests.
 */

export interface RequestTiming {
    createdAt?: any;
    respondedAt?: any;
    status?: string;
  }
  
  /**
   * Calculate average response time in minutes.
   * 
   * Formula: For each accepted/declined request, (respondedAt - createdAt) 
   * in minutes. Returns average.
   */
  export function calculateResponseTime(
    requests: RequestTiming[]
  ): { avgMinutes: number; count: number } {
    if (!requests || requests.length === 0) {
      return { avgMinutes: 0, count: 0 };
    }
  
    let totalMinutes = 0;
    let count = 0;
  
    requests.forEach((req) => {
      // Only consider requests that were responded to
      if (!req.respondedAt || !req.createdAt) return;
      if (req.status !== 'accepted' && req.status !== 'declined') return;
  
      try {
        const created = req.createdAt?.toDate?.() || new Date(req.createdAt);
        const responded = req.respondedAt?.toDate?.() || new Date(req.respondedAt);
        
        const diffMs = responded.getTime() - created.getTime();
        const diffMinutes = diffMs / (1000 * 60);
  
        // Sanity: ignore negative or unrealistically huge values
        if (diffMinutes > 0 && diffMinutes < 60 * 24 * 30) {
          totalMinutes += diffMinutes;
          count++;
        }
      } catch {
        // Skip invalid
      }
    });
  
    if (count === 0) return { avgMinutes: 0, count: 0 };
  
    return {
      avgMinutes: totalMinutes / count,
      count,
    };
  }
  
  /**
   * Format average minutes into a nice human-readable string.
   * 
   * Examples:
   * - 5       → "~5 min"
   * - 45      → "~45 min"
   * - 90      → "~1.5 hr"
   * - 180     → "~3 hr"
   * - 1500    → "~1 day"
   * - 6000    → "~4 days"
   */
  export function formatResponseTime(avgMinutes: number, count: number): string {
    if (count === 0 || avgMinutes === 0) return 'New';
  
    if (avgMinutes < 60) {
      return `~${Math.round(avgMinutes)} min`;
    }
    if (avgMinutes < 60 * 24) {
      const hours = avgMinutes / 60;
      return `~${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr`;
    }
    const days = avgMinutes / (60 * 24);
    return `~${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
  }