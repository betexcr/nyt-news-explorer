import { unifiedSearchService } from './unifiedSearchService';
import type { SearchParams } from './unifiedSearchService';

/**
 * Cache Warmup Service
 * Preloads critical data for the main page to ensure fast loading
 */
class CacheWarmupService {
  private isWarming = false;
  private lastWarmup = 0;
  private readonly WARMUP_INTERVAL = 20 * 60 * 1000; // 20 minutes
  private readonly WARMUP_TIMEOUT = 30 * 1000; // 30 seconds timeout

  // Critical searches for main page
  private readonly CRITICAL_SEARCHES: SearchParams[] = [
    { type: 'most-popular', period: '7' }, // Trending This Week
    { type: 'top-stories', section: 'home' }, // Top Stories Home
    { type: 'top-stories', section: 'technology' }, // Popular tech section
    { type: 'top-stories', section: 'business' }, // Popular business section
  ];

  // Additional warmup searches for common sections
  private readonly COMMON_SEARCHES: SearchParams[] = [
    { type: 'top-stories', section: 'arts' },
    { type: 'top-stories', section: 'science' },
    { type: 'top-stories', section: 'sports' },
    { type: 'top-stories', section: 'health' },
    { type: 'top-stories', section: 'politics' },
    { type: 'top-stories', section: 'world' },
  ];

  /**
   * Check if warmup is needed
   */
  private shouldWarmup(): boolean {
    if (this.isWarming) return false;
    const now = Date.now();
    return now - this.lastWarmup > this.WARMUP_INTERVAL;
  }

  /**
   * Warm up critical searches with timeout
   */
  async warmupCritical(): Promise<{ success: number; failed: number; total: number }> {
    if (!this.shouldWarmup()) {
      return { success: 0, failed: 0, total: 0 };
    }

    this.isWarming = true;
    const startTime = Date.now();
    let success = 0;
    let failed = 0;

    try {
      console.log('🔥 Starting cache warmup for critical searches...');
      
      const warmupPromises = this.CRITICAL_SEARCHES.map(async (searchParams) => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Warmup timeout')), this.WARMUP_TIMEOUT);
          });

          await Promise.race([
            unifiedSearchService.search(searchParams),
            timeoutPromise
          ]);
          
          success++;
          console.log(`✅ Cached: ${searchParams.type} ${searchParams.period || searchParams.section}`);
        } catch (error) {
          failed++;
          console.warn(`❌ Failed to cache: ${searchParams.type} ${searchParams.period || searchParams.section}`, error);
        }
      });

      await Promise.allSettled(warmupPromises);
      
      this.lastWarmup = Date.now();
      const duration = Date.now() - startTime;
      
      console.log(`🎯 Cache warmup completed: ${success} success, ${failed} failed in ${duration}ms`);
      
      return { success, failed, total: this.CRITICAL_SEARCHES.length };
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm up additional common searches (lower priority)
   */
  async warmupCommon(): Promise<{ success: number; failed: number; total: number }> {
    if (this.isWarming) {
      return { success: 0, failed: 0, total: 0 };
    }

    console.log('🔄 Starting background warmup for common searches...');
    
    let success = 0;
    let failed = 0;

    const warmupPromises = this.COMMON_SEARCHES.map(async (searchParams) => {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Warmup timeout')), this.WARMUP_TIMEOUT);
        });

        await Promise.race([
          unifiedSearchService.search(searchParams),
          timeoutPromise
        ]);
        
        success++;
      } catch (error) {
        failed++;
        console.warn(`⚠️ Background warmup failed: ${searchParams.type} ${searchParams.section}`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
    
    console.log(`🔄 Background warmup completed: ${success} success, ${failed} failed`);
    
    return { success, failed, total: this.COMMON_SEARCHES.length };
  }

  /**
   * Full warmup (critical + common)
   */
  async warmupAll(): Promise<{
    critical: { success: number; failed: number; total: number };
    common: { success: number; failed: number; total: number };
  }> {
    const critical = await this.warmupCritical();
    
    // Only warmup common if critical succeeded
    if (critical.success > 0) {
      const common = await this.warmupCommon();
      return { critical, common };
    }
    
    return { critical, common: { success: 0, failed: 0, total: 0 } };
  }

  /**
   * Start automatic warmup with intervals
   */
  startAutomaticWarmup(): () => void {
    console.log('🚀 Starting automatic cache warmup...');
    
    // Initial warmup
    this.warmupCritical();
    
    // Set up interval for critical warmup
    const criticalInterval = setInterval(() => {
      this.warmupCritical();
    }, this.WARMUP_INTERVAL);
    
    // Set up interval for common warmup (less frequent)
    const commonInterval = setInterval(() => {
      this.warmupCommon();
    }, this.WARMUP_INTERVAL * 2);
    
    // Return cleanup function
    return () => {
      console.log('🛑 Stopping automatic cache warmup...');
      clearInterval(criticalInterval);
      clearInterval(commonInterval);
    };
  }

  /**
   * Get warmup status
   */
  getStatus(): {
    isWarming: boolean;
    lastWarmup: number;
    timeSinceLastWarmup: number;
    nextWarmupIn: number;
  } {
    const now = Date.now();
    return {
      isWarming: this.isWarming,
      lastWarmup: this.lastWarmup,
      timeSinceLastWarmup: now - this.lastWarmup,
      nextWarmupIn: Math.max(0, this.WARMUP_INTERVAL - (now - this.lastWarmup)),
    };
  }

  /**
   * Force immediate warmup
   */
  async forceWarmup(): Promise<{
    critical: { success: number; failed: number; total: number };
    common: { success: number; failed: number; total: number };
  }> {
    console.log('⚡ Force warmup requested...');
    this.lastWarmup = 0; // Reset last warmup time
    return this.warmupAll();
  }
}

// Export singleton instance
export const cacheWarmupService = new CacheWarmupService();

// React hook for cache warmup
export function useCacheWarmup() {
  const [status, setStatus] = React.useState(cacheWarmupService.getStatus());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(cacheWarmupService.getStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const warmupCritical = React.useCallback(() => {
    return cacheWarmupService.warmupCritical();
  }, []);
  
  const warmupAll = React.useCallback(() => {
    return cacheWarmupService.warmupAll();
  }, []);
  
  const forceWarmup = React.useCallback(() => {
    return cacheWarmupService.forceWarmup();
  }, []);
  
  const startAutomatic = React.useCallback(() => {
    return cacheWarmupService.startAutomaticWarmup();
  }, []);
  
  return {
    status,
    warmupCritical,
    warmupAll,
    forceWarmup,
    startAutomatic,
  };
}
