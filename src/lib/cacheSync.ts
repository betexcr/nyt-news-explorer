import { queryClient, cacheUtils } from './queryClient';

/**
 * Advanced cache synchronization with Redis ETags
 * Provides intelligent cache invalidation and synchronization
 */

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
  ttl: number;
}

interface SyncResponse {
  data: any;
  etag: string;
  cacheStatus: 'HIT' | 'MISS' | 'STALE' | 'REVALIDATED';
}

/**
 * Cache synchronization manager
 */
export class CacheSyncManager {
  private static instance: CacheSyncManager;
  private cachePrefix = 'nyt-cache-';
  private etagPrefix = 'nyt-etag-';

  private constructor() {}

  static getInstance(): CacheSyncManager {
    if (!CacheSyncManager.instance) {
      CacheSyncManager.instance = new CacheSyncManager();
    }
    return CacheSyncManager.instance;
  }

  /**
   * Store cache entry with ETag in localStorage
   */
  private storeCacheEntry(key: string, entry: CacheEntry): void {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      const etagKey = `${this.etagPrefix}${key}`;
      
      localStorage.setItem(cacheKey, JSON.stringify(entry.data));
      localStorage.setItem(etagKey, entry.etag);
      localStorage.setItem(`${cacheKey}-meta`, JSON.stringify({
        timestamp: entry.timestamp,
        ttl: entry.ttl,
      }));
    } catch (error) {
      console.warn('Failed to store cache entry:', error);
    }
  }

  /**
   * Retrieve cache entry from localStorage
   */
  private getCacheEntry(key: string): CacheEntry | null {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      const etagKey = `${this.etagPrefix}${key}`;
      const metaKey = `${cacheKey}-meta`;
      
      const data = localStorage.getItem(cacheKey);
      const etag = localStorage.getItem(etagKey);
      const meta = localStorage.getItem(metaKey);
      
      if (!data || !etag || !meta) return null;
      
      const { timestamp, ttl } = JSON.parse(meta);
      
      // Check if cache is expired
      if (Date.now() - timestamp > ttl) {
        this.removeCacheEntry(key);
        return null;
      }
      
      return {
        data: JSON.parse(data),
        etag,
        timestamp,
        ttl,
      };
    } catch (error) {
      console.warn('Failed to retrieve cache entry:', error);
      return null;
    }
  }

  /**
   * Remove cache entry from localStorage
   */
  private removeCacheEntry(key: string): void {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      const etagKey = `${this.etagPrefix}${key}`;
      
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(etagKey);
      localStorage.removeItem(`${cacheKey}-meta`);
    } catch (error) {
      console.warn('Failed to remove cache entry:', error);
    }
  }

  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${type}:${btoa(sortedParams).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Check if data should be fetched from server
   */
  async shouldFetch(
    type: string, 
    params: Record<string, any>, 
    options: { 
      forceRefresh?: boolean;
      maxAge?: number;
      etag?: string;
    } = {}
  ): Promise<{ shouldFetch: boolean; cachedData?: any; etag?: string }> {
    const { forceRefresh = false, maxAge, etag: providedEtag } = options;
    
    if (forceRefresh) {
      return { shouldFetch: true };
    }

    // Check TanStack Query cache first
    const queryKey = [type, params];
    const tanstackData = cacheUtils.getCachedData(queryKey);
    const isTanstackFresh = cacheUtils.isDataFresh(queryKey);
    
    if (tanstackData && isTanstackFresh) {
      return { shouldFetch: false, cachedData: tanstackData };
    }

    // Check localStorage cache
    const cacheKey = this.generateCacheKey(type, params);
    const cacheEntry = this.getCacheEntry(cacheKey);
    
    if (cacheEntry) {
      // If ETag is provided, check if it matches
      if (providedEtag && cacheEntry.etag === providedEtag) {
        // Data is still valid, update TanStack cache
        cacheUtils.setCachedData(queryKey, cacheEntry.data);
        return { shouldFetch: false, cachedData: cacheEntry.data, etag: cacheEntry.etag };
      }
      
      // If no ETag provided, check maxAge
      if (maxAge && Date.now() - cacheEntry.timestamp < maxAge) {
        cacheUtils.setCachedData(queryKey, cacheEntry.data);
        return { shouldFetch: false, cachedData: cacheEntry.data, etag: cacheEntry.etag };
      }
    }

    return { shouldFetch: true, etag: cacheEntry?.etag };
  }

  /**
   * Store response data with ETag synchronization
   */
  async storeResponse(
    type: string,
    params: Record<string, any>,
    response: SyncResponse,
    ttl: number = 60 * 60 * 1000 // 1 hour default
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(type, params);
    const queryKey = [type, params];
    
    // Store in localStorage with metadata
    const entry: CacheEntry = {
      data: response.data,
      etag: response.etag,
      timestamp: Date.now(),
      ttl,
    };
    
    this.storeCacheEntry(cacheKey, entry);
    
    // Store in TanStack Query cache
    cacheUtils.setCachedData(queryKey, response.data);
    
    console.log(`[CACHE SYNC] Stored ${type} with status: ${response.cacheStatus}`);
  }

  /**
   * Invalidate cache entries by type or pattern
   */
  invalidateCache(type?: string, pattern?: string): void {
    try {
      const keys = Object.keys(localStorage);
      
      if (type) {
        // Invalidate specific type
        const typeKeys = keys.filter(key => 
          key.startsWith(`${this.cachePrefix}${type}:`) ||
          key.startsWith(`${this.etagPrefix}${type}:`)
        );
        
        typeKeys.forEach(key => {
          const cleanKey = key.replace(this.cachePrefix, '').replace(this.etagPrefix, '');
          this.removeCacheEntry(cleanKey);
        });
        
        // Also invalidate TanStack Query cache
        cacheUtils.invalidateByType(type);
        
      } else if (pattern) {
        // Invalidate by pattern
        const patternKeys = keys.filter(key => 
          key.includes(pattern) && (
            key.startsWith(this.cachePrefix) ||
            key.startsWith(this.etagPrefix)
          )
        );
        
        patternKeys.forEach(key => {
          const cleanKey = key.replace(this.cachePrefix, '').replace(this.etagPrefix, '');
          this.removeCacheEntry(cleanKey);
        });
        
      } else {
        // Invalidate all cache
        const cacheKeys = keys.filter(key => 
          key.startsWith(this.cachePrefix) ||
          key.startsWith(this.etagPrefix)
        );
        
        cacheKeys.forEach(key => {
          const cleanKey = key.replace(this.cachePrefix, '').replace(this.etagPrefix, '');
          this.removeCacheEntry(cleanKey);
        });
        
        cacheUtils.invalidateAll();
      }
      
      console.log(`[CACHE SYNC] Invalidated cache for ${type || pattern || 'all'}`);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    localStorageEntries: number;
    tanstackQueries: number;
    totalSize: string;
  } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) totalSize += value.length;
      });
      
      const tanstackStats = cacheUtils.getCacheStats();
      
      return {
        localStorageEntries: cacheKeys.length,
        tanstackQueries: tanstackStats.totalQueries,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {
        localStorageEntries: 0,
        tanstackQueries: 0,
        totalSize: '0 KB',
      };
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries(): void {
    try {
      const keys = Object.keys(localStorage);
      const metaKeys = keys.filter(key => key.endsWith('-meta'));
      
      metaKeys.forEach(metaKey => {
        try {
          const meta = localStorage.getItem(metaKey);
          if (meta) {
            const { timestamp, ttl } = JSON.parse(meta);
            if (Date.now() - timestamp > ttl) {
              const cacheKey = metaKey.replace('-meta', '');
              const cleanKey = cacheKey.replace(this.cachePrefix, '');
              this.removeCacheEntry(cleanKey);
            }
          }
        } catch (error) {
          // Remove corrupted entries
          const cacheKey = metaKey.replace('-meta', '');
          const cleanKey = cacheKey.replace(this.cachePrefix, '');
          this.removeCacheEntry(cleanKey);
        }
      });
      
      console.log('[CACHE SYNC] Cleaned up expired entries');
    } catch (error) {
      console.warn('Failed to cleanup expired entries:', error);
    }
  }
}

// Export singleton instance
export const cacheSync = CacheSyncManager.getInstance();

// Cleanup expired entries on app start
if (typeof window !== 'undefined') {
  cacheSync.cleanupExpiredEntries();
}
