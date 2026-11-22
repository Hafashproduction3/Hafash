/**
 * Rate limiter — per-second + concurrent limit.
 * Server action burst aur R2 burst dono control mein rakhta hai.
 */
class RateLimiter {
    private queue: Array<() => Promise<void>> = [];
    private active = 0;
    private recent: number[] = [];
  
    constructor(
      private maxConcurrent: number,
      private maxPerSecond: number
    ) {}
  
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const now = Date.now();
            this.recent = this.recent.filter((t) => now - t < 1000);
  
            if (this.recent.length >= this.maxPerSecond) {
              const waitMs = 1000 - (now - this.recent[0]) + 10;
              await new Promise((r) => setTimeout(r, waitMs));
            }
  
            this.recent.push(Date.now());
  
            const result = await fn();
            resolve(result);
          } catch (e) {
            reject(e);
          } finally {
            this.active--;
            this.next();
          }
        });
        this.next();
      });
    }
  
    private next(): void {
      if (this.active >= this.maxConcurrent || this.queue.length === 0) {
        return;
      }
      this.active++;
      const task = this.queue.shift()!;
      task();
    }
  }
  
  // ✅ Server action: max 3 concurrent, max 5/sec
  export const serverActionLimiter = new RateLimiter(3, 5);
  
  // ✅ R2 PUT: max 4 concurrent, max 10/sec
  export const r2UploadLimiter = new RateLimiter(4, 10);