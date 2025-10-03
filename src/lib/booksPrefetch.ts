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
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 5, // Process 5 categories at a time
};

// Popular book categories to prefetch
const POPULAR_BOOK_CATEGORIES = [
  'hardcover-fiction',
  'hardcover-nonfiction', 
  'trade-fiction-paperback',
  'paperback-nonfiction',
  'advice-how-to-and-miscellaneous',
  'childrens-middle-grade-hardcover',
  'picture-books',
  'series-books',
  'young-adult-hardcover',
  'combined-print-and-e-book-fiction',
  'combined-print-and-e-book-nonfiction',
  'e-book-fiction',
  'e-book-nonfiction',
  'mass-market-paperback',
  'graphic-books-and-manga',
  'business-books',
  'science',
  'sports',
  'travel',
  'food-and-fitness',
  'relationships',
  'religion-spirituality-and-faith',
  'family',
  'education',
  'games-and-activities',
  'crime-and-punishment',
  'expeditions',
  'animals',
  'health',
  'humor',
];

class BooksPrefetchManager {
  private static instance: BooksPrefetchManager;
  private isRunning: boolean = false;
  private lastRunDate: string | null = null;
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
   * Run the prefetch process
   */
  async runPrefetch(): Promise<void> {
    if (!PREFETCH_CONFIG.enabled || this.isRunning || !this.shouldRunToday()) {
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
      
      // Small delay between batches to avoid overwhelming the API
      await this.delay(PREFETCH_CONFIG.retryDelay);
    }

    this.isRunning = false;
    this.saveStats();
    
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
        
        // Fetch books for this category
        const books = await getBestSellers(category);
        
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
        
      } catch (error) {
        attempts++;
        console.warn(`[BOOKS PREFETCH] Failed to fetch ${category} (attempt ${attempts}):`, error);
        
        if (attempts < maxRetries) {
          await this.delay(PREFETCH_CONFIG.retryDelay * attempts);
        }
      }
    }
    
    this.stats.failed++;
    console.error(`[BOOKS PREFETCH] Failed to fetch ${category} after ${maxRetries} attempts`);
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

// Auto-start prefetch if it should run today
if (typeof window !== 'undefined') {
  // Check if we should run prefetch on app start
  setTimeout(() => {
    if (booksPrefetch['shouldRunToday']()) {
      console.log('[BOOKS PREFETCH] Running prefetch on app start');
      booksPrefetch['triggerPrefetch']();
    }
  }, 2000); // Wait 2 seconds after app start
}
