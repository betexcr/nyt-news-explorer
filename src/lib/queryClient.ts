import { QueryClient } from '@tanstack/react-query';

/**
 * Default configuration for TanStack Query
 * Optimized for caching and performance with Redis sync
 */
export const queryDefaults = {
  queries: {
    // Data is considered fresh for 1 minute
    staleTime: 60_000,
    
    // Keep unused data in cache for 5 minutes
    gcTime: 300_000,
    
    // Don't refetch on window focus to reduce unnecessary requests
    refetchOnWindowFocus: false,
    
    // Retry with exponential backoff
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on reconnect for fresh data
    refetchOnReconnect: true,
    
    // Refetch on mount if data exists
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    retryDelay: 1000,
  },
};

/**
 * Content-specific cache strategies optimized for different data types
 */
export const cacheStrategies = {
  // Search results - moderate caching (frequently changing)
  search: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  },
  
  // Top stories - longer caching (updates every 30 min)
  topStories: {
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  },
  
  // Article details - long caching (static content)
  articleDetail: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  },
  
  // Archive data - very long caching (never changes)
  archive: {
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  },
  
  // Books data - long caching (weekly updates)
  books: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 12 * 60 * 60 * 1000, // 12 hours
    refetchOnWindowFocus: false,
  },
  
  // Reference data - very long caching (rarely changes)
  reference: {
    staleTime: 8 * 60 * 60 * 1000, // 8 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  },
};

/**
 * Create a new QueryClient instance with default configuration
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryDefaults,
  });
}

/**
 * Default QueryClient instance
 */
export const queryClient = createQueryClient();

/**
 * Helper function to get cache strategy for a query type
 */
export function getCacheStrategy(type: keyof typeof cacheStrategies) {
  return cacheStrategies[type] || queryDefaults.queries;
}

/**
 * Advanced cache utilities for synchronization and management
 */
export const cacheUtils = {
  // Invalidate all cache entries
  invalidateAll: () => queryClient.invalidateQueries(),
  
  // Invalidate specific content type
  invalidateByType: (type: string) => queryClient.invalidateQueries({ queryKey: [type] }),
  
  // Clear all cache data
  clearAll: () => queryClient.clear(),
  
  // Prefetch data for better UX
  prefetch: async (queryKey: any[], queryFn: () => Promise<any>, options?: any) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      ...options,
    });
  },
  
  // Get cached data without triggering fetch
  getCachedData: (queryKey: any[]) => queryClient.getQueryData(queryKey),
  
  // Set cached data manually
  setCachedData: (queryKey: any[], data: any) => queryClient.setQueryData(queryKey, data),
  
  // Check if data is fresh
  isDataFresh: (queryKey: any[]) => {
    const query = queryClient.getQueryState(queryKey);
    return query && !query.isInvalidated && !query.isStale;
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale).length,
      invalidQueries: queries.filter(q => q.isInvalidated).length,
      freshQueries: queries.filter(q => !q.isStale && !q.isInvalidated).length,
    };
  },
};
