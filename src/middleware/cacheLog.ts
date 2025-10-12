import { ckey } from '../lib/redis';

export type CacheStatus = 'HIT' | 'MISS' | 'STALE' | 'REVAL';

export interface CacheLogEntry {
  route: string;
  key: string;
  status: CacheStatus;
  duration: number;
  timestamp: number;
  userId?: string;
}

// In-memory cache statistics (in production, use Redis or external metrics)
const cacheStats = {
  hits: 0,
  misses: 0,
  stale: 0,
  reval: 0,
  totalRequests: 0,
};

/**
 * Log cache operation with timing and status
 */
export function logCacheOperation(
  route: string,
  key: string,
  status: CacheStatus,
  startTime: number,
  userId?: string
): void {
  const duration = Date.now() - startTime;
  const _entry: CacheLogEntry = {
    route,
    key,
    status,
    duration,
    timestamp: Date.now(),
    userId,
  };

  // Update statistics
  cacheStats.totalRequests++;
  switch (status) {
    case 'HIT':
      cacheStats.hits++;
      break;
    case 'MISS':
      cacheStats.misses++;
      break;
    case 'STALE':
      cacheStats.stale++;
      break;
    case 'REVAL':
      cacheStats.reval++;
      break;
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CACHE ${status}] ${route} - ${key} (${duration}ms)`);
  }

  // In production, you might want to send this to an external logging service
  // or store in Redis for analytics
}

/**
 * Get current cache statistics
 */
export function getCacheStats() {
  const hitRatio = cacheStats.totalRequests > 0 
    ? (cacheStats.hits / cacheStats.totalRequests) * 100 
    : 0;

  return {
    ...cacheStats,
    hitRatio: Math.round(hitRatio * 100) / 100,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  Object.keys(cacheStats).forEach(key => {
    (cacheStats as any)[key] = 0;
  });
}

/**
 * Create cache headers for response
 */
export function createCacheHeaders(status: CacheStatus): Record<string, string> {
  return {
    'X-Cache-Status': status,
    'X-Cache-Timestamp': new Date().toISOString(),
  };
}

/**
 * Middleware function to wrap cache operations
 */
export function withCacheLogging<T>(
  operation: () => Promise<T>,
  route: string,
  key: string,
  userId?: string
): Promise<{ data: T; status: CacheStatus }> {
  const startTime = Date.now();
  
  return operation().then(
    (data) => {
      logCacheOperation(route, key, 'HIT', startTime, userId);
      return { data, status: 'HIT' as CacheStatus };
    },
    (error) => {
      logCacheOperation(route, key, 'MISS', startTime, userId);
      throw error;
    }
  );
}
