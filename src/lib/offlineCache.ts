import { _cacheSync } from './cacheSync';
import { queryClient } from './queryClient';

/**
 * Offline-first caching system with intelligent fallbacks
 * Provides seamless offline experience with cached data
 */

interface OfflineConfig {
  enableOfflineMode: boolean;
  maxOfflineAge: number;
  fallbackData?: any;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Offline cache manager
 */
export class OfflineCacheManager {
  private static instance: OfflineCacheManager;
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: Array<{
    type: string;
    params: any;
    queryFn: () => Promise<any>;
    timestamp: number;
  }> = [];

  private constructor() {
    this.setupOnlineOfflineListeners();
  }

  static getInstance(): OfflineCacheManager {
    if (!OfflineCacheManager.instance) {
      OfflineCacheManager.instance = new OfflineCacheManager();
    }
    return OfflineCacheManager.instance;
  }

  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      console.log('[OFFLINE CACHE] Back online, processing queued requests');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[OFFLINE CACHE] Gone offline, enabling offline mode');
      this.isOnline = false;
    });
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get cached data with offline fallback
   */
  async getCachedDataWithFallback<T>(
    type: string,
    params: any,
    queryFn: () => Promise<T>,
    config: Partial<OfflineConfig> = {}
  ): Promise<T> {
    const {
      enableOfflineMode = true,
      maxOfflineAge = 24 * 60 * 60 * 1000, // 24 hours
      fallbackData,
      retryAttempts = 3,
      retryDelay = 1000,
    } = config;

    // If online, try to fetch fresh data
    if (this.isOnline) {
      try {
        const result = await queryFn();
        return result;
      } catch (error) {
        console.warn('[OFFLINE CACHE] Online fetch failed, falling back to cache:', error);
        // Fall through to offline logic
      }
    }

    // If offline or online fetch failed, try cached data
    if (enableOfflineMode) {
      const cachedData = await this.getOfflineData(type, params, maxOfflineAge);
      if (cachedData) {
        console.log('[OFFLINE CACHE] Using cached data for offline mode');
        return cachedData;
      }
    }

    // If no cached data and offline, queue the request
    if (!this.isOnline) {
      this.queueOfflineRequest(type, params, queryFn);
      
      if (fallbackData) {
        console.log('[OFFLINE CACHE] Using fallback data');
        return fallbackData;
      }
      
      throw new Error('No cached data available and device is offline');
    }

    // If online but no cached data, retry with exponential backoff
    return this.retryWithBackoff(queryFn, retryAttempts, retryDelay);
  }

  /**
   * Get offline cached data
   */
  private async getOfflineData(type: string, params: any, maxAge: number): Promise<any> {
    try {
      // Check TanStack Query cache first
      const queryKey = [type, params];
      const tanstackData = queryClient.getQueryData(queryKey);
      
      if (tanstackData) {
        return tanstackData;
      }

      // Check localStorage cache
      const cacheKey = `${type}:${JSON.stringify(params)}`;
      const cachedData = localStorage.getItem(`nyt-cache-${cacheKey}`);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        
        // Check if data is within max age
        if (Date.now() - timestamp <= maxAge) {
          return data;
        }
      }

      return null;
    } catch (error) {
      console.warn('[OFFLINE CACHE] Error getting offline data:', error);
      return null;
    }
  }

  /**
   * Queue request for when device comes back online
   */
  private queueOfflineRequest(type: string, params: any, queryFn: () => Promise<any>): void {
    this.offlineQueue.push({
      type,
      params,
      queryFn,
      timestamp: Date.now(),
    });

    console.log(`[OFFLINE CACHE] Queued request for ${type}`, params);
  }

  /**
   * Process queued requests when back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`[OFFLINE CACHE] Processing ${this.offlineQueue.length} queued requests`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of queue) {
      try {
        await request.queryFn();
        console.log(`[OFFLINE CACHE] Processed queued request for ${request.type}`);
      } catch (error) {
        console.warn(`[OFFLINE CACHE] Failed to process queued request for ${request.type}:`, error);
      }
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    queryFn: () => Promise<T>,
    attempts: number,
    delay: number
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await queryFn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        
        const backoffDelay = delay * Math.pow(2, i);
        console.log(`[OFFLINE CACHE] Retry ${i + 1}/${attempts} in ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Preload critical data for offline use
   */
  async preloadCriticalData(): Promise<void> {
    console.log('[OFFLINE CACHE] Preloading critical data for offline use');

    const criticalQueries: Array<{
      type: string;
      params: any;
      queryFn: () => Promise<any>;
    }> = [
      // Add critical queries that should be available offline
      // This would be populated based on your app's needs
    ];

    const promises = criticalQueries.map(async (query) => {
      try {
        await query.queryFn();
        console.log(`[OFFLINE CACHE] Preloaded ${query.type}`);
      } catch (error) {
        console.warn(`[OFFLINE CACHE] Failed to preload ${query.type}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('[OFFLINE CACHE] Critical data preloading complete');
  }

  /**
   * Clear offline cache
   */
  clearOfflineCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const offlineKeys = keys.filter(key => key.startsWith('nyt-cache-'));
      
      offlineKeys.forEach(key => localStorage.removeItem(key));
      
      this.offlineQueue = [];
      
      console.log('[OFFLINE CACHE] Cleared offline cache');
    } catch (error) {
      console.warn('[OFFLINE CACHE] Error clearing offline cache:', error);
    }
  }

  /**
   * Get offline cache statistics
   */
  getOfflineStats(): {
    isOnline: boolean;
    queuedRequests: number;
    cachedItems: number;
    cacheSize: string;
  } {
    try {
      const keys = Object.keys(localStorage);
      const cachedKeys = keys.filter(key => key.startsWith('nyt-cache-'));
      
      let totalSize = 0;
      cachedKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) totalSize += value.length;
      });

      return {
        isOnline: this.isOnline,
        queuedRequests: this.offlineQueue.length,
        cachedItems: cachedKeys.length,
        cacheSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.warn('[OFFLINE CACHE] Error getting offline stats:', error);
      return {
        isOnline: this.isOnline,
        queuedRequests: 0,
        cachedItems: 0,
        cacheSize: '0 KB',
      };
    }
  }
}

// Export singleton instance
export const offlineCache = OfflineCacheManager.getInstance();

// Preload critical data when app starts
if (typeof window !== 'undefined') {
  // Preload after a short delay to not block initial render
  setTimeout(() => {
    offlineCache.preloadCriticalData();
  }, 2000);
}
