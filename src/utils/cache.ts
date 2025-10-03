/**
 * Cache management utilities for the NYT News Explorer
 */

export interface CacheInfo {
  hasData: boolean;
  timestamp: number;
  articleCount: number;
  query: string;
  scrollPosition: number;
}

/**
 * Get information about the current cache state
 */
export const getCacheInfo = (): CacheInfo => {
  if (typeof window === 'undefined') {
    return {
      hasData: false,
      timestamp: 0,
      articleCount: 0,
      query: '',
      scrollPosition: 0,
    };
  }

  try {
    const storeData = sessionStorage.getItem('search-store');
    const scrollData = sessionStorage.getItem('search-page-scroll');
    
    if (!storeData) {
      return {
        hasData: false,
        timestamp: 0,
        articleCount: 0,
        query: '',
        scrollPosition: 0,
      };
    }

    const parsed = JSON.parse(storeData);
    const state = parsed.state || {};
    
    return {
      hasData: true,
      timestamp: parsed.state?.timestamp || Date.now(),
      articleCount: state.articles?.length || 0,
      query: state.query || '',
      scrollPosition: parseInt(scrollData || '0', 10),
    };
  } catch (error) {
    console.error('Error reading cache info:', error);
    return {
      hasData: false,
      timestamp: 0,
      articleCount: 0,
      query: '',
      scrollPosition: 0,
    };
  }
};

/**
 * Clear all cached data including Service Worker caches, IndexedDB, and browser cache
 */
export const clearAllCache = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    console.log('[CACHE] Starting comprehensive cache clearing...');
    
    // 1. Clear localStorage and sessionStorage
    sessionStorage.removeItem('search-store');
    sessionStorage.removeItem('search-page-scroll');
    
    // Clear all NYT-related cache items
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith('search-') || key.startsWith('nyt-')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear all localStorage cache items
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (key.startsWith('nyt-cache-') || 
          key.startsWith('nyt-etag-') || 
          key.includes('books-prefetch') ||
          key.includes('search-store')) {
        localStorage.removeItem(key);
      }
    });
    
    // 2. Clear Service Worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[CACHE] Deleting Service Worker cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      } catch (error) {
        console.warn('[CACHE] Failed to clear Service Worker caches:', error);
      }
    }
    
    // 3. Clear IndexedDB databases
    if ('indexedDB' in window) {
      try {
        // List of known IndexedDB databases to clear
        const dbNames = ['nyt-cache', 'search-cache', 'offline-cache'];
        
        await Promise.all(
          dbNames.map(dbName => {
            return new Promise<void>((resolve) => {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => {
                console.log(`[CACHE] Deleted IndexedDB: ${dbName}`);
                resolve();
              };
              deleteReq.onerror = () => {
                console.warn(`[CACHE] Failed to delete IndexedDB: ${dbName}`);
                resolve(); // Continue even if one fails
              };
              deleteReq.onblocked = () => {
                console.warn(`[CACHE] IndexedDB deletion blocked: ${dbName}`);
                resolve();
              };
            });
          })
        );
      } catch (error) {
        console.warn('[CACHE] Failed to clear IndexedDB:', error);
      }
    }
    
    // 4. Clear WebSQL (legacy support)
    if ('openDatabase' in window) {
      try {
        // WebSQL is deprecated but some browsers might still have it
        const db = (window as any).openDatabase('nyt-cache', '1.0', 'NYT Cache', 2 * 1024 * 1024);
        if (db) {
          db.transaction((tx: any) => {
            tx.executeSql('DROP TABLE IF EXISTS cache');
          });
        }
      } catch (error) {
        console.warn('[CACHE] Failed to clear WebSQL:', error);
      }
    }
    
    // 5. Clear browser HTTP cache (if possible)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('[CACHE] Unregistering Service Worker:', registration.scope);
            return registration.unregister();
          })
        );
      } catch (error) {
        console.warn('[CACHE] Failed to unregister Service Workers:', error);
      }
    }
    
    // 6. Clear any remaining cache entries
    if ('caches' in window) {
      try {
        // Force clear all caches again to ensure nothing is missed
        const allCaches = await caches.keys();
        await Promise.all(
          allCaches.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.warn('[CACHE] Failed to clear remaining caches:', error);
      }
    }
    
    console.log('[CACHE] Comprehensive cache clearing completed');
    
    // 7. Reload the page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
    
  } catch (error) {
    console.error('[CACHE] Error during cache clearing:', error);
    // Fallback to basic clearing
    sessionStorage.clear();
    localStorage.clear();
    window.location.reload();
  }
};

/**
 * Export cache data as a string
 */
export const exportCacheData = (): string => {
  if (typeof window === 'undefined') return '';
  
  try {
    const storeData = sessionStorage.getItem('search-store');
    const scrollData = sessionStorage.getItem('search-page-scroll');
    
    return JSON.stringify({
      store: storeData,
      scroll: scrollData,
      timestamp: Date.now(),
      version: '1.0',
    });
  } catch (error) {
    console.error('Error exporting cache:', error);
    return '';
  }
};

/**
 * Import cache data from a string
 */
export const importCacheData = (data: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const parsed = JSON.parse(data);
    
    if (parsed.store) {
      sessionStorage.setItem('search-store', parsed.store);
    }
    
    if (parsed.scroll) {
      sessionStorage.setItem('search-page-scroll', parsed.scroll);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing cache:', error);
    return false;
  }
};

/**
 * Check if cache is stale (older than specified time)
 */
export const isCacheStale = (maxAgeMs: number = 24 * 60 * 60 * 1000): boolean => {
  const info = getCacheInfo();
  if (!info.hasData) return true;
  
  const now = Date.now();
  return (now - info.timestamp) > maxAgeMs;
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const info = getCacheInfo();
  
  return {
    hasData: info.hasData,
    age: info.hasData ? Date.now() - info.timestamp : 0,
    articleCount: info.articleCount,
    query: info.query,
    scrollPosition: info.scrollPosition,
    isStale: isCacheStale(),
  };
};
