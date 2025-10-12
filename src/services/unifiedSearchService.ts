import axios from 'axios';
import { getBackendApiUrl } from '../config/api';
import type { NytArticle } from '../types/nyt';
import type { MostPopularArticle } from '../types/nyt.other';
import type { TopStory } from '../types/nyt.other';

// Unified search types
export type SearchType = 'articles' | 'most-popular' | 'top-stories' | 'archive';
export type SearchPeriod = '1' | '7' | '30';
export type SearchSection = 'home' | 'arts' | 'automobiles' | 'books' | 'business' | 'fashion' | 'food' | 'health' | 'insider' | 'magazine' | 'movies' | 'nyregion' | 'obituaries' | 'opinion' | 'politics' | 'realestate' | 'science' | 'sports' | 'sundayreview' | 'technology' | 'theater' | 't-magazine' | 'travel' | 'upshot' | 'us' | 'world';
export type SearchSort = 'newest' | 'oldest' | 'best' | 'relevance';

// Unified article interface
export interface UnifiedArticle {
  id: string;
  url: string;
  title: string;
  abstract: string;
  byline: string;
  publishedDate: string;
  section: string;
  imageUrl: string;
  source: SearchType;
  // Additional metadata
  rank?: number; // For most popular
  badge?: string; // For top stories
}

// Search parameters
export interface SearchParams {
  type: SearchType;
  query?: string;
  page?: number;
  sort?: SearchSort;
  period?: SearchPeriod;
  section?: SearchSection;
  beginDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}

// Search result
export interface SearchResult {
  articles: UnifiedArticle[];
  totalCount: number;
  hasMore: boolean;
  cached: boolean;
  source: SearchType;
}

// Error types
export class SearchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export class SearchRateLimitError extends SearchError {
  constructor() {
    super(
      'API rate limit exceeded. Please wait a moment before making another request.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
    this.name = 'SearchRateLimitError';
  }
}

// API endpoints - all using our backend
const ENDPOINTS = {
  search: '/api/articles/search',
  mostPopular: '/api/articles/most-popular',
  topStories: '/api/articles/top-stories',
  archive: '/api/articles/archive',
} as const;

// Unified search service class
class UnifiedSearchService {
  private cache = new Map<string, { data: SearchResult; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Normalize different article types to unified format
  private normalizeArticle(article: any, source: SearchType, index?: number): UnifiedArticle {
    const baseArticle = {
      id: article._id || article.id || article.uri || article.url || `article-${Date.now()}-${index}`,
      url: article.web_url || article.url || '',
      title: article.headline?.main || article.title || 'No Title',
      abstract: article.abstract || article.snippet || '',
      byline: article.byline?.original || article.byline || 'Unknown',
      publishedDate: article.pub_date || article.published_date || new Date().toISOString(),
      section: article.section_name || article.section || 'General',
      imageUrl: this.extractImageUrl(article),
      source,
      ...(index !== undefined && { rank: index + 1 }),
      ...(source === 'top-stories' && { badge: 'Top Story' }),
    };

    return baseArticle;
  }

  // Extract image URL from different article formats
  private extractImageUrl(article: any): string {
    // Most Popular articles
    if (article.media && article.media.length > 0) {
      const media = article.media[0];
      const mm = media['media-metadata'] || [];
      const preferred = mm.find((m: any) => /^(Large|superJumbo|mediumThreeByTwo440)$/i.test(m.format)) ||
                      mm.find((m: any) => /^(mediumThreeByTwo210|Large Thumbnail)$/i.test(m.format)) ||
                      mm.find((m: any) => /^(Standard Thumbnail)$/i.test(m.format)) ||
                      mm[0];
      if (preferred?.url) return preferred.url;
    }

    // Top Stories articles
    if (article.multimedia && article.multimedia.length > 0) {
      const media = article.multimedia[0];
      if (media?.legacy?.xlarge) return media.legacy.xlarge;
      if (media?.url) return media.url;
    }

    // Search articles
    if (article.multimedia && article.multimedia.length > 0) {
      const media = article.multimedia[0];
      if (media?.url) return media.url;
    }

    return '/logo.png';
  }

  // Generate cache key
  private getCacheKey(params: SearchParams): string {
    return JSON.stringify(params);
  }

  // Check if cache entry is valid
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  // Make API request with error handling
  private async makeRequest<T>(endpoint: string, params: Record<string, any>, signal?: AbortSignal): Promise<T> {
    try {
      const url = getBackendApiUrl(endpoint);
      const response = await axios.get(url, { params, signal });
      return response.data;
    } catch (error: any) {
      // Check for rate limit error
      const responseData = error.response?.data;
      const isRateLimitError = 
        responseData?.fault?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
        responseData?.fault?.fault?.errorcode === 'policies.ratelimit.QuotaViolation' ||
        responseData?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
        responseData?.fault?.errorcode === 'policies.ratelimit.QuotaViolation';
      
      if (isRateLimitError) {
        throw new SearchRateLimitError();
      }
      
      throw new SearchError(`API request failed: ${error.message}`, error.response?.status);
    }
  }

  // Main search method
  async search(params: SearchParams): Promise<SearchResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return { ...cached.data, cached: true };
    }

    let result: SearchResult;

    try {
      switch (params.type) {
        case 'articles':
          result = await this.searchArticles(params);
          break;
        case 'most-popular':
          result = await this.searchMostPopular(params);
          break;
        case 'top-stories':
          result = await this.searchTopStories(params);
          break;
        case 'archive':
          result = await this.searchArchive(params);
          break;
        default:
          throw new SearchError(`Unknown search type: ${params.type}`);
      }

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return { ...result, cached: false };
    } catch (error) {
      if (error instanceof SearchRateLimitError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Article search
  private async searchArticles(params: SearchParams): Promise<SearchResult> {
    const searchParams: Record<string, any> = {
      q: params.query || '',
      page: params.page || 0,
      sort: params.sort || 'relevance',
    };

    if (params.beginDate) searchParams.begin_date = params.beginDate.replace(/-/g, '');
    if (params.endDate) searchParams.end_date = params.endDate.replace(/-/g, '');

    const data = await this.makeRequest(ENDPOINTS.search, searchParams, params.signal) as any;
    const articles = (data.response?.docs || []).map((article: any, index: number) => 
      this.normalizeArticle(article, 'articles', index)
    );

    return {
      articles,
      totalCount: data.response?.meta?.hits || articles.length,
      hasMore: articles.length >= 10, // NYT returns 10 per page
      source: 'articles',
      cached: false,
    };
  }

  // Most Popular search
  private async searchMostPopular(params: SearchParams): Promise<SearchResult> {
    const data = await this.makeRequest(
      `${ENDPOINTS.mostPopular}/${params.period || '7'}`,
      {},
      params.signal
    ) as any;

    const articles = (data.results || []).map((article: any, index: number) => 
      this.normalizeArticle(article, 'most-popular', index)
    );

    return {
      articles,
      totalCount: data.num_results || articles.length,
      hasMore: false, // Most popular doesn't have pagination
      source: 'most-popular',
      cached: false,
    };
  }

  // Top Stories search
  private async searchTopStories(params: SearchParams): Promise<SearchResult> {
    const data = await this.makeRequest(
      `${ENDPOINTS.topStories}/${params.section || 'home'}`,
      {},
      params.signal
    ) as any;

    const articles = (data.results || []).map((article: any, index: number) => 
      this.normalizeArticle(article, 'top-stories', index)
    );

    return {
      articles,
      totalCount: data.num_results || articles.length,
      hasMore: false, // Top stories doesn't have pagination
      source: 'top-stories',
      cached: false,
    };
  }

  // Archive search
  private async searchArchive(params: SearchParams): Promise<SearchResult> {
    // Archive search would need year/month params
    throw new SearchError('Archive search not yet implemented');
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  // Preload common searches
  async preloadCommonSearches(): Promise<void> {
    const commonSearches: SearchParams[] = [
      { type: 'most-popular', period: '7' },
      { type: 'top-stories', section: 'home' },
      { type: 'top-stories', section: 'technology' },
      { type: 'top-stories', section: 'business' },
    ];

    await Promise.allSettled(
      commonSearches.map(search => this.search(search))
    );
  }

  // Optimized preload for main page
  async preloadMainPageData(): Promise<{
    trending: SearchResult;
    topStories: SearchResult;
  }> {
    const [trending, topStories] = await Promise.all([
      this.search({ type: 'most-popular', period: '7' }),
      this.search({ type: 'top-stories', section: 'home' }),
    ]);

    return { trending, topStories };
  }
}

// Export singleton instance
export const unifiedSearchService = new UnifiedSearchService();

// Export convenience functions for backward compatibility
export async function searchArticles(query: string, signal?: AbortSignal): Promise<UnifiedArticle[]> {
  const result = await unifiedSearchService.search({
    type: 'articles',
    query,
    signal,
  });
  return result.articles;
}

export async function getMostPopular(period: SearchPeriod = '7', signal?: AbortSignal): Promise<UnifiedArticle[]> {
  const result = await unifiedSearchService.search({
    type: 'most-popular',
    period,
    signal,
  });
  return result.articles;
}

export async function getTopStories(section: SearchSection = 'home', signal?: AbortSignal): Promise<UnifiedArticle[]> {
  const result = await unifiedSearchService.search({
    type: 'top-stories',
    section,
    signal,
  });
  return result.articles;
}

export async function searchArticlesAdvanced(params: {
  query: string;
  page?: number;
  sort?: SearchSort;
  beginDate?: string;
  endDate?: string;
  section?: string;
  signal?: AbortSignal;
}): Promise<UnifiedArticle[]> {
  const result = await unifiedSearchService.search({
    type: 'articles',
    query: params.query,
    page: params.page,
    sort: params.sort,
    beginDate: params.beginDate,
    endDate: params.endDate,
    signal: params.signal,
  });
  return result.articles;
}
