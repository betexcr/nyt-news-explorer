import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedSearchService, SearchParams, SearchResult, UnifiedArticle, SearchError, SearchRateLimitError, SearchSection } from '../services/unifiedSearchService';

// Hook options
export interface UseUnifiedSearchOptions {
  autoSearch?: boolean;
  debounceMs?: number;
  cacheResults?: boolean;
}

// Hook return type
export interface UseUnifiedSearchReturn {
  // State
  articles: UnifiedArticle[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  rateLimitError: boolean;
  hasMore: boolean;
  totalCount: number;
  cached: boolean;
  
  // Actions
  search: (params: SearchParams) => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;
  clearResults: () => void;
  
  // Cache management
  clearCache: () => void;
  preloadCommon: () => Promise<void>;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function useUnifiedSearch(
  initialParams?: Partial<SearchParams>,
  options: UseUnifiedSearchOptions = {}
): UseUnifiedSearchReturn {
  const {
    autoSearch = false,
    debounceMs = 500,
    cacheResults = true,
  } = options;

  // State
  const [articles, setArticles] = useState<UnifiedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [cached, setCached] = useState(false);

  // Refs
  const currentParams = useRef<SearchParams | null>(null);
  const currentPage = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setRateLimitError(false);
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setArticles([]);
    setHasMore(false);
    setTotalCount(0);
    setCached(false);
    currentPage.current = 0;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    unifiedSearchService.clearCache();
  }, []);

  // Preload common searches
  const preloadCommon = useCallback(async () => {
    try {
      await unifiedSearchService.preloadCommonSearches();
    } catch (err) {
      console.warn('Failed to preload common searches:', err);
    }
  }, []);

  // Main search function
  const performSearch = useCallback(async (params: SearchParams, isLoadMore = false) => {
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        clearError();
      }

      const result = await unifiedSearchService.search({
        ...params,
        signal,
        page: isLoadMore ? currentPage.current + 1 : (params.page || 0),
      });

      if (signal.aborted) return;

      if (isLoadMore) {
        setArticles(prev => [...prev, ...result.articles]);
        currentPage.current += 1;
      } else {
        setArticles(result.articles);
        currentPage.current = 0;
      }

      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setCached(result.cached);
      currentParams.current = params;

      setError(null);
      setRateLimitError(false);
    } catch (err) {
      if (signal.aborted) return;

      if (err instanceof SearchRateLimitError) {
        setRateLimitError(true);
        setError('API rate limit exceeded. Please wait a moment before making another request.');
      } else if (err instanceof SearchError) {
        setError(err.message);
        setRateLimitError(false);
      } else {
        setError('An unexpected error occurred');
        setRateLimitError(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [clearError]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((params: SearchParams) => performSearch(params, false), debounceMs),
    [performSearch, debounceMs]
  );

  // Public search function
  const search = useCallback(async (params: SearchParams) => {
    clearResults();
    await performSearch(params, false);
  }, [performSearch, clearResults]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!currentParams.current || loadingMore || !hasMore) return;
    await performSearch(currentParams.current, true);
  }, [performSearch, loadingMore, hasMore]);

  // Auto-search on mount
  useEffect(() => {
    if (autoSearch && initialParams) {
      search(initialParams as SearchParams);
    }
  }, [autoSearch, initialParams, search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    // State
    articles,
    loading,
    loadingMore,
    error,
    rateLimitError,
    hasMore,
    totalCount,
    cached,
    
    // Actions
    search,
    loadMore,
    clearError,
    clearResults,
    
    // Cache management
    clearCache,
    preloadCommon,
  };
}

// Specialized hooks for common use cases
export function useArticleSearch(query?: string, options?: UseUnifiedSearchOptions) {
  return useUnifiedSearch(
    query ? { type: 'articles', query } : undefined,
    { autoSearch: !!query, ...options }
  );
}

export function useMostPopular(period: '1' | '7' | '30' = '7', options?: UseUnifiedSearchOptions) {
  return useUnifiedSearch(
    { type: 'most-popular', period },
    { autoSearch: true, ...options }
  );
}

export function useTopStories(section: SearchSection = 'home', options?: UseUnifiedSearchOptions) {
  return useUnifiedSearch(
    { type: 'top-stories', section },
    { autoSearch: true, ...options }
  );
}

export function useAdvancedSearch(options?: UseUnifiedSearchOptions) {
  return useUnifiedSearch(undefined, { autoSearch: false, ...options });
}
