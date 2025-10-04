import { queryClient } from './queryClient';
import { cacheSync } from './cacheSync';
import { getBestSellers } from '../api/nyt-apis';

/**
 * Daily Books Prefetching System
 * Prefetches and caches all available book categories for instant loading
 */

interface PrefetchConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}

interface PrefetchStats {
  totalCategories: number;
  successful: number;
  failed: number;
  cached: number;
  lastRun: Date | null;
  nextRun: Date | null;
}

// Configuration for books prefetching
const PREFETCH_CONFIG: PrefetchConfig = {
  enabled: true,
  maxRetries: 2, // Reduced from 3 to avoid overwhelming the API
  retryDelay: 2000, // Increased delay between retries
  batchSize: 3, // Reduced batch size to be more gentle on the API
};

// Popular book categories to prefetch (verified working categories)
const POPULAR_BOOK_CATEGORIES = [
  'hardcover-fiction',
  'hardcover-nonfiction', 
  'trade-fiction-paperback',
  'paperback-nonfiction',
  'advice-how-to-and-miscellaneous',
  'series-books',
  'young-adult-hardcover',
  'combined-print-and-e-book-fiction',
  'combined-print-and-e-book-nonfiction',
  'mass-market-paperback',
  'graphic-books-and-manga',
  'business-books',
  'science',
  'sports',
  'travel',
  'food-and-fitness',
  'relationships',
  'education',
  'crime-and-punishment',
  'health',
  'humor',
];

class BooksPrefetchManager {
  private static instance: BooksPrefetchManager;
  private isRunning: boolean = false;
  private lastRunDate: string | null = null;
  private consecutiveFailures: number = 0;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerResetTime: number = 0;
  private stats: PrefetchStats = {
    totalCategories: 0,
    successful: 0,
    failed: 0,
    cached: 0,
    lastRun: null,
    nextRun: null,
  };

  private constructor() {
    this.loadStats();
    this.scheduleDailyPrefetch();
  }

  static getInstance(): BooksPrefetchManager {
    if (!BooksPrefetchManager.instance) {
      BooksPrefetchManager.instance = new BooksPrefetchManager();
    }
    return BooksPrefetchManager.instance;
  }

  /**
   * Check if prefetch should run today
   */
  private shouldRunToday(): boolean {
    const today = new Date().toDateString();
    return this.lastRunDate !== today;
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem('books-prefetch-stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.stats = {
          ...this.stats,
          ...parsed,
          lastRun: parsed.lastRun ? new Date(parsed.lastRun) : null,
          nextRun: parsed.nextRun ? new Date(parsed.nextRun) : null,
        };
      }
      
      const lastRun = localStorage.getItem('books-prefetch-last-run');
      this.lastRunDate = lastRun;
    } catch (error) {
      console.warn('[BOOKS PREFETCH] Failed to load stats:', error);
    }
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem('books-prefetch-stats', JSON.stringify(this.stats));
      if (this.stats.lastRun) {
        localStorage.setItem('books-prefetch-last-run', this.stats.lastRun.toDateString());
        this.lastRunDate = this.stats.lastRun.toDateString();
      }
    } catch (error) {
      console.warn('[BOOKS PREFETCH] Failed to save stats:', error);
    }
  }

  /**
   * Schedule daily prefetch at 6 AM
   */
  private scheduleDailyPrefetch(): void {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0); // 6 AM
    
    // If it's already past 6 AM today, schedule for tomorrow
    if (now.getHours() >= 6) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    this.stats.nextRun = nextRun;
    this.saveStats();

    // Calculate time until next run
    const timeUntilRun = nextRun.getTime() - now.getTime();
    
    console.log(`[BOOKS PREFETCH] Scheduled for ${nextRun.toLocaleString()}`);
    
    setTimeout(() => {
      this.runPrefetch();
      this.scheduleDailyPrefetch(); // Schedule next run
    }, timeUntilRun);
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) {
      return false;
    }
    
    // Reset circuit breaker after 30 minutes
    if (Date.now() - this.circuitBreakerResetTime > 30 * 60 * 1000) {
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
      console.log('[BOOKS PREFETCH] Circuit breaker reset');
      return false;
    }
    
    return true;
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitBreakerOpen = false;
  }

  /**
   * Record a failed operation
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
    
    // Open circuit breaker after 5 consecutive failures
    if (this.consecutiveFailures >= 5) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now();
      console.warn('[BOOKS PREFETCH] Circuit breaker opened due to consecutive failures');
    }
  }

  /**
   * Run the prefetch process
   */
  async runPrefetch(): Promise<void> {
    if (!PREFETCH_CONFIG.enabled || this.isRunning || !this.shouldRunToday()) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      console.warn('[BOOKS PREFETCH] Circuit breaker is open, skipping prefetch');
      return;
    }

    console.log('[BOOKS PREFETCH] Starting daily prefetch...');
    this.isRunning = true;
    
    // Reset stats
    this.stats = {
      totalCategories: POPULAR_BOOK_CATEGORIES.length,
      successful: 0,
      failed: 0,
      cached: 0,
      lastRun: new Date(),
      nextRun: this.stats.nextRun,
    };

    // Process categories in batches
    const batches = this.chunkArray(POPULAR_BOOK_CATEGORIES, PREFETCH_CONFIG.batchSize);
    
    for (const batch of batches) {
      await this.processBatch(batch);
      
      // Longer delay between batches to avoid overwhelming the API
      await this.delay(PREFETCH_CONFIG.retryDelay * 2);
    }

    this.isRunning = false;
    this.saveStats();
    
    // Record overall success/failure for circuit breaker
    if (this.stats.failed === 0) {
      this.recordSuccess();
    } else if (this.stats.failed > this.stats.successful) {
      this.recordFailure();
    }
    
    console.log(`[BOOKS PREFETCH] Completed: ${this.stats.successful}/${this.stats.totalCategories} successful`);
  }

  /**
   * Process a batch of categories
   */
  private async processBatch(categories: string[]): Promise<void> {
    const promises = categories.map(category => this.prefetchCategory(category));
    await Promise.allSettled(promises);
  }

  /**
   * Prefetch a single book category
   */
  private async prefetchCategory(category: string): Promise<void> {
    const maxRetries = PREFETCH_CONFIG.maxRetries;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        console.log(`[BOOKS PREFETCH] Fetching ${category} (attempt ${attempts + 1})`);
        
        // Create abort signal with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          // Fetch books for this category
          const books = await getBestSellers(category, controller.signal);
          
          // Store in TanStack Query cache
          const queryKey = ['books', { list: category }];
          queryClient.setQueryData(queryKey, books);
          
          // Store in localStorage cache with daily TTL
          await cacheSync.storeResponse(
            'books',
            { list: category },
            {
              data: books,
              etag: `daily-${new Date().toDateString()}`,
              cacheStatus: 'MISS',
            },
            24 * 60 * 60 * 1000 // 24 hours TTL
          );
          
          this.stats.successful++;
          this.stats.cached++;
          
          console.log(`[BOOKS PREFETCH] Successfully cached ${category} (${books.length} books)`);
          return;
        } finally {
          clearTimeout(timeoutId);
        }
        
      } catch (error: any) {
        attempts++;
        
        // Check if it's a network error that we should retry
        const isNetworkError = error?.code === 'ERR_NETWORK' || 
                              error?.name === 'NytApiError' ||
                              error?.message?.includes('Network Error') ||
                              error?.message?.includes('timeout');
        
        if (isNetworkError) {
          console.warn(`[BOOKS PREFETCH] Network error for ${category} (attempt ${attempts}):`, error.message);
        } else {
          console.warn(`[BOOKS PREFETCH] API error for ${category} (attempt ${attempts}):`, error.message);
        }
        
        if (attempts < maxRetries && isNetworkError) {
          // Exponential backoff for network errors
          const delay = PREFETCH_CONFIG.retryDelay * Math.pow(2, attempts - 1);
          console.log(`[BOOKS PREFETCH] Retrying ${category} in ${delay}ms...`);
          await this.delay(delay);
        } else if (attempts >= maxRetries || !isNetworkError) {
          // Don't retry non-network errors or after max attempts
          break;
        }
      }
    }
    
    this.stats.failed++;
    console.error(`[BOOKS PREFETCH] Failed to fetch ${category} after ${attempts} attempts`);
  }

  /**
   * Check if a category is cached and fresh
   */
  isCategoryCached(category: string): boolean {
    const queryKey = ['books', { list: category }];
    const cachedData = queryClient.getQueryData(queryKey);
    
    if (cachedData) {
      // Check if data is from today using the same cache key generation as cacheSync
      const params = { list: category };
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key as keyof typeof params]}`)
        .join('|');
      const cacheKey = `books:${btoa(sortedParams).replace(/[^a-zA-Z0-9]/g, '')}`;
      const cacheEntry = localStorage.getItem(`nyt-cache-${cacheKey}`);
      
      if (cacheEntry) {
        try {
          const { timestamp } = JSON.parse(cacheEntry);
          const cacheDate = new Date(timestamp).toDateString();
          const today = new Date().toDateString();
          
          return cacheDate === today;
        } catch (error) {
          console.warn('[BOOKS PREFETCH] Error checking cache freshness:', error);
        }
      }
    }
    
    return false;
  }

  /**
   * Get cached books for a category
   */
  getCachedBooks(category: string): any[] | null {
    const queryKey = ['books', { list: category }];
    const cachedData = queryClient.getQueryData(queryKey);
    
    // Debug logging
    console.log(`[BOOKS PREFETCH] Getting cached books for category: ${category}`);
    console.log(`[BOOKS PREFETCH] Query key:`, queryKey);
    console.log(`[BOOKS PREFETCH] Cached data exists:`, !!cachedData);
    if (cachedData) {
      console.log(`[BOOKS PREFETCH] Cached data length:`, Array.isArray(cachedData) ? cachedData.length : 'not array');
    }
    
    return Array.isArray(cachedData) ? cachedData : null;
  }

  /**
   * Get prefetch statistics
   */
  getStats(): PrefetchStats {
    return { ...this.stats };
  }

  /**
   * Manually trigger prefetch
   */
  async triggerPrefetch(): Promise<void> {
    console.log('[BOOKS PREFETCH] Manual trigger requested');
    await this.runPrefetch();
  }

  /**
   * Clear all books cache entries to force fresh data
   */
  clearBooksCache(): void {
    console.log('[BOOKS PREFETCH] Clearing all books cache entries');
    
    // Clear TanStack Query cache for books
    queryClient.removeQueries({ queryKey: ['books'] });
    
    // Clear localStorage cache entries for books
    try {
      const keys = Object.keys(localStorage);
      const booksCacheKeys = keys.filter(key => 
        key.startsWith('nyt-cache-books:') ||
        key.startsWith('nyt-etag-books:') ||
        key.includes('books-prefetch')
      );
      
      booksCacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`[BOOKS PREFETCH] Cleared ${booksCacheKeys.length} cache entries`);
    } catch (error) {
      console.warn('[BOOKS PREFETCH] Failed to clear cache:', error);
    }
  }

  /**
   * Enable/disable prefetching
   */
  setEnabled(enabled: boolean): void {
    PREFETCH_CONFIG.enabled = enabled;
    console.log(`[BOOKS PREFETCH] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const booksPrefetch = BooksPrefetchManager.getInstance();

// Auto-start prefetch if it should run today (with better error handling)
if (typeof window !== 'undefined') {
  // Check if we should run prefetch on app start
  setTimeout(() => {
    try {
      if (booksPrefetch['shouldRunToday']()) {
        console.log('[BOOKS PREFETCH] Running prefetch on app start');
        booksPrefetch['triggerPrefetch']().catch(error => {
          console.warn('[BOOKS PREFETCH] Auto-prefetch failed:', error);
        });
      }
    } catch (error) {
      console.warn('[BOOKS PREFETCH] Failed to check if prefetch should run:', error);
    }
  }, 5000); // Wait 5 seconds after app start to let the app fully load
}
