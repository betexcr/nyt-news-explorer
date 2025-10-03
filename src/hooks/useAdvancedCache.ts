import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheSync } from '../lib/cacheSync';
import { getCacheStrategy } from '../lib/queryClient';

interface UseAdvancedCacheOptions {
  type: 'search' | 'topStories' | 'articleDetail' | 'archive' | 'books' | 'reference';
  params: Record<string, any>;
  queryFn: () => Promise<any>;
  enabled?: boolean;
  prefetch?: boolean;
  backgroundRefresh?: boolean;
  maxAge?: number;
}

/**
 * Advanced caching hook with Redis ETag synchronization
 * Provides intelligent cache management, prefetching, and background updates
 */
export function useAdvancedCache<T = any>({
  type,
  params,
  queryFn,
  enabled = true,
  prefetch = false,
  backgroundRefresh = true,
  maxAge,
}: UseAdvancedCacheOptions) {
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);
  const prefetchRef = useRef<boolean>(false);

  // Generate query key
  const queryKey = [type, params];
  
  // Get cache strategy for this content type
  const cacheStrategy = getCacheStrategy(type);

  // Enhanced query function with ETag support
  const enhancedQueryFn = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      // Check if we should fetch from cache first
      const { shouldFetch, cachedData, etag } = await cacheSync.shouldFetch(type, params, {
        maxAge,
        etag: undefined, // We'll get this from the response
      });

      if (!shouldFetch && cachedData) {
        console.log(`[CACHE] Using cached data for ${type}`, params);
        return cachedData;
      }

      // Make API request with ETag if available
      const response = await queryFn();
      
      // Extract ETag from response headers if available
      let responseEtag: string | undefined;
      let cacheStatus: 'HIT' | 'MISS' | 'STALE' | 'REVALIDATED' = 'MISS';
      
      // Check if response has ETag information
      if (response && typeof response === 'object') {
        // Look for ETag in response metadata
        if ('etag' in response) {
          responseEtag = response.etag;
        }
        if ('cacheStatus' in response) {
          cacheStatus = response.cacheStatus;
        }
      }

      // Store response with ETag synchronization
      await cacheSync.storeResponse(
        type,
        params,
        {
          data: response,
          etag: responseEtag || `fallback-${Date.now()}`,
          cacheStatus,
        },
        cacheStrategy.gcTime || 60 * 60 * 1000 // Use cache strategy TTL
      );

      lastFetchRef.current = Date.now();
      console.log(`[CACHE] Fetched fresh data for ${type}`, params);
      
      return response;
    } catch (error) {
      console.error(`[CACHE] Error fetching ${type}:`, error);
      throw error;
    }
  }, [type, params, queryFn, maxAge, cacheStrategy.gcTime]);

  // Main query hook
  const query = useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    enabled,
    ...cacheStrategy,
    // Add prefetching options
    refetchOnMount: prefetch ? false : cacheStrategy.refetchOnMount,
    refetchOnWindowFocus: prefetch ? false : cacheStrategy.refetchOnWindowFocus,
  });

  // Background refresh effect
  useEffect(() => {
    if (!backgroundRefresh || !enabled) return;

    const interval = setInterval(async () => {
      // Only refresh if data is stale and enough time has passed
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      const staleTime = cacheStrategy.staleTime || 60 * 1000;
      
      if (timeSinceLastFetch > staleTime && query.data) {
        try {
          // Check if we should refresh
          const { shouldFetch } = await cacheSync.shouldFetch(type, params, {
            maxAge: staleTime,
          });

          if (shouldFetch) {
            console.log(`[CACHE] Background refresh for ${type}`, params);
            queryClient.invalidateQueries({ queryKey });
          }
        } catch (error) {
          console.warn(`[CACHE] Background refresh failed for ${type}:`, error);
        }
      }
    }, Math.min(cacheStrategy.staleTime || 60 * 1000, 5 * 60 * 1000)); // Max 5 minutes

    return () => clearInterval(interval);
  }, [backgroundRefresh, enabled, type, params, query.data, cacheStrategy.staleTime, queryClient, queryKey]);

  // Prefetch effect
  useEffect(() => {
    if (!prefetch || prefetchRef.current || !enabled) return;

    prefetchRef.current = true;

    const prefetchData = async () => {
      try {
        const { shouldFetch } = await cacheSync.shouldFetch(type, params);
        
        if (shouldFetch) {
          console.log(`[CACHE] Prefetching ${type}`, params);
          await queryClient.prefetchQuery({
            queryKey,
            queryFn: enhancedQueryFn,
            ...cacheStrategy,
          });
        }
      } catch (error) {
        console.warn(`[CACHE] Prefetch failed for ${type}:`, error);
      }
    };

    // Prefetch after a short delay to not block initial render
    const timeoutId = setTimeout(prefetchData, 100);

    return () => {
      clearTimeout(timeoutId);
      prefetchRef.current = false;
    };
  }, [prefetch, enabled, type, params, queryKey, enhancedQueryFn, cacheStrategy, queryClient]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    console.log(`[CACHE] Manual refresh for ${type}`, params);
    
    // Force refresh by invalidating cache
    cacheSync.invalidateCache(type, JSON.stringify(params));
    queryClient.invalidateQueries({ queryKey });
    
    return query.refetch();
  }, [type, params, queryKey, query, queryClient]);

  // Clear cache function
  const clearCache = useCallback(() => {
    console.log(`[CACHE] Clearing cache for ${type}`, params);
    cacheSync.invalidateCache(type, JSON.stringify(params));
    queryClient.removeQueries({ queryKey });
  }, [type, params, queryKey, queryClient]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      ...cacheSync.getCacheStats(),
      queryStats: {
        isFetching: query.isFetching,
        isStale: query.isStale,
        isError: query.isError,
        dataUpdatedAt: query.dataUpdatedAt,
        errorUpdatedAt: query.errorUpdatedAt,
      },
    };
  }, [query]);

  return {
    ...query,
    refresh,
    clearCache,
    getCacheStats,
    // Additional cache info
    cacheStrategy,
    lastFetchTime: lastFetchRef.current,
  };
}

/**
 * Hook for prefetching related content
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(async (
    type: string,
    params: Record<string, any>,
    queryFn: () => Promise<any>
  ) => {
    const queryKey = [type, params];
    const cacheStrategy = getCacheStrategy(type as any);

    try {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        ...cacheStrategy,
      });
      console.log(`[PREFETCH] Prefetched ${type}`, params);
    } catch (error) {
      console.warn(`[PREFETCH] Failed to prefetch ${type}:`, error);
    }
  }, [queryClient]);

  const prefetchMultiple = useCallback(async (
    prefetchItems: Array<{
      type: string;
      params: Record<string, any>;
      queryFn: () => Promise<any>;
    }>
  ) => {
    const promises = prefetchItems.map(item => 
      prefetchQuery(item.type, item.params, item.queryFn)
    );

    await Promise.allSettled(promises);
    console.log(`[PREFETCH] Completed ${prefetchItems.length} prefetch operations`);
  }, [prefetchQuery]);

  return {
    prefetchQuery,
    prefetchMultiple,
  };
}

/**
 * Hook for cache management and statistics
 */
export function useCacheManager() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    cacheSync.invalidateCache();
    queryClient.invalidateQueries();
    console.log('[CACHE MANAGER] Invalidated all cache');
  }, [queryClient]);

  const invalidateByType = useCallback((type: string) => {
    cacheSync.invalidateCache(type);
    queryClient.invalidateQueries({ queryKey: [type] });
    console.log(`[CACHE MANAGER] Invalidated cache for ${type}`);
  }, [queryClient]);

  const getStats = useCallback(() => {
    return {
      ...cacheSync.getCacheStats(),
      tanstackStats: queryClient.getQueryCache().getAll().reduce((acc, query) => {
        acc.total++;
        if (query.isStale) acc.stale++;
        if (query.isInvalidated) acc.invalidated++;
        if (!query.isStale && !query.isInvalidated) acc.fresh++;
        return acc;
      }, { total: 0, stale: 0, invalidated: 0, fresh: 0 }),
    };
  }, [queryClient]);

  const cleanup = useCallback(() => {
    cacheSync.cleanupExpiredEntries();
    console.log('[CACHE MANAGER] Cleaned up expired entries');
  }, []);

  return {
    invalidateAll,
    invalidateByType,
    getStats,
    cleanup,
  };
}
