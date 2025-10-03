import { useAdvancedCache, useCacheManager } from './useAdvancedCache';
import { 
  getTopStories, 
  getMostPopular, 
  getBestSellers, 
  getBooksListByDate,
  getArchive,
  searchArticles 
} from '../api/nyt-apis';
import type { TopStory, MostPopularArticle, Book, ArchiveArticle } from '../api/nyt-apis';

/**
 * Enhanced API hooks with advanced caching and Redis synchronization
 */

// Top Stories Hook
export function useTopStories(section: string = 'home', enabled: boolean = true) {
  return useAdvancedCache<TopStory[]>({
    type: 'topStories',
    params: { section },
    queryFn: () => getTopStories(section),
    enabled,
    prefetch: true,
    backgroundRefresh: true,
  });
}

// Most Popular Hook
export function useMostPopular(period: 1 | 7 | 30 = 7, enabled: boolean = true) {
  return useAdvancedCache<MostPopularArticle[]>({
    type: 'topStories', // Use same strategy as top stories
    params: { period },
    queryFn: () => getMostPopular(period.toString() as '1' | '7' | '30'),
    enabled,
    prefetch: true,
    backgroundRefresh: true,
  });
}

// Books Best Sellers Hook
export function useBestSellers(list: string = 'hardcover-fiction', enabled: boolean = true) {
  return useAdvancedCache<Book[]>({
    type: 'books',
    params: { list },
    queryFn: () => getBestSellers(list),
    enabled,
    prefetch: true,
    backgroundRefresh: true,
  });
}

// Books List by Date Hook
export function useBooksListByDate(
  list: string, 
  date: string, 
  enabled: boolean = true
) {
  return useAdvancedCache<Book[]>({
    type: 'books',
    params: { list, date },
    queryFn: () => getBooksListByDate(list, date),
    enabled,
    prefetch: false, // Don't prefetch dated lists
    backgroundRefresh: false, // Don't background refresh dated lists
  });
}

// Archive Hook
export function useArchive(
  year: number, 
  month: number, 
  options: {
    dayStart?: number;
    dayEnd?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { dayStart, dayEnd, limit = 50, enabled = true } = options;
  
  return useAdvancedCache<ArchiveArticle[]>({
    type: 'archive',
    params: { year, month, dayStart, dayEnd, limit },
    queryFn: () => getArchive(year, month, undefined, { dayStart, dayEnd, limit }),
    enabled,
    prefetch: false, // Don't prefetch archive data
    backgroundRefresh: false, // Archive data never changes
    maxAge: 4 * 60 * 60 * 1000, // 4 hours max age
  });
}

// Search Hook
export function useSearch(
  query: string,
  options: {
    page?: number;
    sort?: 'newest' | 'oldest' | 'relevance';
    beginDate?: string;
    endDate?: string;
    section?: string;
    enabled?: boolean;
  } = {}
) {
  const { 
    page = 0, 
    sort = 'relevance', 
    beginDate, 
    endDate, 
    section, 
    enabled = true 
  } = options;
  
  return useAdvancedCache({
    type: 'search',
    params: { query, page, sort, beginDate, endDate, section },
    queryFn: () => searchArticles(query, page, sort, beginDate, endDate),
    enabled: enabled && !!query.trim(),
    prefetch: false, // Don't prefetch search results
    backgroundRefresh: false, // Search results are user-specific
    maxAge: 10 * 60 * 1000, // 10 minutes max age
  });
}

/**
 * Prefetch hooks for related content
 */
export function usePrefetchTopStories() {
  const { prefetchQuery } = useCacheManager(); // Just to get prefetch function
  
  const prefetchSection = async (section: string) => {
    await prefetchQuery('topStories', { section }, () => getTopStories(section));
  };
  
  const prefetchPopularSections = async () => {
    const popularSections = ['home', 'technology', 'business', 'sports', 'world'];
    const promises = popularSections.map(section => prefetchSection(section));
    await Promise.allSettled(promises);
  };
  
  return {
    prefetchSection,
    prefetchPopularSections,
  };
}

export function usePrefetchBooks() {
  const { prefetchQuery } = useCacheManager(); // Just to get prefetch function
  
  const prefetchList = async (list: string) => {
    await prefetchQuery('books', { list }, () => getBestSellers(list));
  };
  
  const prefetchPopularLists = async () => {
    const popularLists = [
      'hardcover-fiction',
      'hardcover-nonfiction',
      'trade-fiction-paperback',
      'paperback-nonfiction'
    ];
    const promises = popularLists.map(list => prefetchList(list));
    await Promise.allSettled(promises);
  };
  
  return {
    prefetchList,
    prefetchPopularLists,
  };
}

/**
 * Cache management hooks
 */
export function useApiCacheManager() {
  const { invalidateAll, invalidateByType, getStats, cleanup } = useCacheManager();
  
  const invalidateTopStories = () => invalidateByType('topStories');
  const invalidateBooks = () => invalidateByType('books');
  const invalidateArchive = () => invalidateByType('archive');
  const invalidateSearch = () => invalidateByType('search');
  
  return {
    invalidateAll,
    invalidateTopStories,
    invalidateBooks,
    invalidateArchive,
    invalidateSearch,
    getStats,
    cleanup,
  };
}
