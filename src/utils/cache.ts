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
 * Clear all cached data
 */
export const clearAllCache = (): void => {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('search-store');
  sessionStorage.removeItem('search-page-scroll');
  
  // Also clear any other related cache items
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('search-') || key.startsWith('nyt-')) {
      sessionStorage.removeItem(key);
    }
  });
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
