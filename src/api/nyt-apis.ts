import axios, { AxiosResponse } from "axios";
import type {
  MostPopularArticle,
  MostPopularResponse,
  TopStory,
  TopStoriesResponse,
  Book,
  // _BooksResponse,
  ArchiveArticle,
  ArchiveResponse,
} from "../types/nyt.other";
export type { MostPopularArticle, TopStory, Book, ArchiveArticle } from "../types/nyt.other";

// Base configuration
const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";

// Use NYT API directly for now (backend API will be implemented in another branch)
const isDevelopment = process.env.NODE_ENV === 'development';
const BASE_URL = "https://api.nytimes.com/svc";

// API endpoints - all using direct NYT API
const ENDPOINTS = {
  // Article Search API
  ARTICLE_SEARCH: `${BASE_URL}/search/v2/articlesearch.json`,
  
  // Most Popular API
  MOST_POPULAR: `${BASE_URL}/mostpopular/v2`,
  
  // Top Stories API
  TOP_STORIES: `${BASE_URL}/topstories/v2`,
  
  // Movie Reviews API
  MOVIE_REVIEWS: `${BASE_URL}/movies/v2/reviews`,
  
  // Books API
  BOOKS: `${BASE_URL}/books/v3`,
  
  // Archive API
  ARCHIVE: `${BASE_URL}/archive/v1`,
  
  // Semantic API
  SEMANTIC: `${BASE_URL}/semantic/v2`,
} as const;

// Base parameters for all API calls
function baseParams(): Record<string, string> {
  return { 
    "api-key": API_KEY,
  };
}

// Error handling utility
class NytApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "NytApiError";
  }
}

// Generic API request function with error handling and CORS fallback
async function makeApiRequest<T>(
  url: string,
  params: Record<string, any> = {},
  signal?: AbortSignal,
  options?: { timeoutMs?: number }
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await axios.get(url, {
      params: { ...baseParams(), ...params },
      signal,
      timeout: options?.timeoutMs,
    });
    return response.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new NytApiError('Request was cancelled', 0, 'ABORTED');
    }
    
    // If it's a CORS error and we're in development, try with the full URL
    if (isDevelopment && error.message?.includes('CORS')) {
      console.warn('CORS error detected, trying direct API call...');
      try {
        const fullUrl = url.replace('/svc', 'https://api.nytimes.com/svc');
        const response: AxiosResponse<T> = await axios.get(fullUrl, {
          params: { ...baseParams(), ...params },
          signal,
          timeout: options?.timeoutMs,
        });
        return response.data;
      } catch (fallbackError: any) {
        console.warn('Direct API call also failed:', fallbackError.message);
      }
    }
    
    const status = error.response?.status;
    const message = error.response?.data?.message || error.response?.data?.fault?.faultstring || error.message;
    const code = error.code || (status === 403 ? 'FORBIDDEN' : undefined);
    throw new NytApiError(`API request failed: ${message}`, status, code);
  }
}


// Type definitions for different APIs
// Movie Reviews kept local since endpoint is deprecated and may be removed from app usage
export interface MovieReview {
  display_title: string;
  mpaa_rating: string;
  critics_pick: number;
  byline: string;
  headline: string;
  summary_short: string;
  publication_date: string;
  opening_date: string;
  date_updated: string;
  link: { type: string; url: string; suggested_link_text: string };
  multimedia: { type: string; src: string; height: number; width: number } | null;
}
export interface MovieReviewsResponse {
  status: string;
  copyright: string;
  has_more: boolean;
  num_results: number;
  results: MovieReview[];
}

// Most Popular API
export async function getMostPopular(
  period: '1' | '7' | '30' = '7',
  signal?: AbortSignal
): Promise<MostPopularArticle[]> {
  const url = `${ENDPOINTS.MOST_POPULAR}/viewed/${period}.json`;
  const response = await makeApiRequest<MostPopularResponse>(url, {}, signal);
  return response.results;
}

// Top Stories API
export async function getTopStories(
  section: string = 'home',
  signal?: AbortSignal
): Promise<TopStory[]> {
  const url = `${ENDPOINTS.TOP_STORIES}/${section}.json`;
  const response = await makeApiRequest<TopStoriesResponse>(url, {}, signal);
  return response.results;
}

// Article Search API - fetch a single day range to avoid large Archive payloads
export async function searchArticlesByDay(
  year: number,
  month: number,
  day: number,
  signal?: AbortSignal
): Promise<ArchiveArticle[]> {
  const url = ENDPOINTS.ARTICLE_SEARCH;
  // NYT expects YYYYMMDD
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const ymd = `${y}${m}${d}`;
  const params = {
    begin_date: ymd,
    end_date: ymd,
    sort: 'oldest',
    // Limit fields to reduce payload
    fl: [
      'web_url',
      'uri',
      'pub_date',
      'headline',
      'abstract',
      'snippet',
      'byline',
      'section_name',
      'news_desk',
    ].join(','),
  } as Record<string, string>;
  
  const data = await makeApiRequest<any>(url, params, signal, { timeoutMs: 15000 });
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  return docs as unknown as ArchiveArticle[];
}

// Movie Reviews API
export async function getMovieReviews(
  type: 'all' | 'picks' = 'all',
  signal?: AbortSignal
): Promise<MovieReview[]> {
  const url = `${ENDPOINTS.MOVIE_REVIEWS}/${type}.json`;
  const response = await makeApiRequest<MovieReviewsResponse>(url, {}, signal);
  return response.results;
}

// Books API - Best Sellers
export async function getBestSellers(
  list: string = 'hardcover-fiction',
  signal?: AbortSignal
): Promise<Book[]> {
  const url = `${ENDPOINTS.BOOKS}/lists/current/${list}.json`;
  const data = await makeApiRequest<any>(url, {}, signal);
  // Handle both our local type and the real NYT response shape
  const results = data?.results;
  if (Array.isArray(results)) return results as Book[];
  if (results && Array.isArray(results.books)) return results.books as Book[];
  return [] as Book[];
}

// Books API - Lists Overview (shows all lists and their latest dates)
export async function getBooksListsOverview(
  signal?: AbortSignal
): Promise<any> {
  const url = `${ENDPOINTS.BOOKS}/lists/overview.json`;
  const data = await makeApiRequest<any>(url, {}, signal);
  return data?.results ?? data;
}

// Books API - Dated List for a specific list and date (YYYY-MM-DD)
export async function getBooksListByDate(
  list: string,
  date: string, // 'current' or 'YYYY-MM-DD'
  signal?: AbortSignal
): Promise<Book[]> {
  const url = `${ENDPOINTS.BOOKS}/lists/${encodeURIComponent(date)}/${encodeURIComponent(list)}.json`;
  const data = await makeApiRequest<any>(url, {}, signal);
  const results = data?.results;
  if (results && Array.isArray(results.books)) return results.books as Book[];
  return [] as Book[];
}

// Archive API
export async function getArchive(
  year: number,
  month: number,
  signal?: AbortSignal
): Promise<ArchiveArticle[]> {
  const url = `${ENDPOINTS.ARCHIVE}/${year}/${month}.json`;
  const params = { 'api-key': API_KEY };
  const response = await makeApiRequest<ArchiveResponse>(url, params, signal, { timeoutMs: 20000 });
  return response.response.docs;
}

// Available sections for Top Stories
export const TOP_STORIES_SECTIONS = [
  'home',
  'arts',
  'automobiles',
  'books',
  'business',
  'fashion',
  'food',
  'health',
  'insider',
  'magazine',
  'movies',
  'nyregion',
  'obituaries',
  'opinion',
  'politics',
  'realestate',
  'science',
  'sports',
  'sundayreview',
  'technology',
  'theater',
  't-magazine',
  'travel',
  'upshot',
  'us',
  'world'
] as const;

// Available periods for Most Popular
export const MOST_POPULAR_PERIODS = ['1', '7', '30'] as const;

// Available lists for Books
export const BOOKS_LISTS = [
  'hardcover-fiction',
  'hardcover-nonfiction',
  'trade-fiction-paperback',
  'mass-market-paperback',
  'paperback-nonfiction',
  'e-book-fiction',
  'e-book-nonfiction',
  'combined-print-and-e-book-fiction',
  'combined-print-and-e-book-nonfiction',
  'advice-how-to-and-miscellaneous',
  'childrens-middle-grade-hardcover',
  'childrens-picture-books',
  'young-adult-hardcover',
  'series-books',
  'audio-fiction',
  'audio-nonfiction',
  'business-books',
  'celebrities',
  'crime-and-punishment',
  'culture',
  'education',
  'food-and-fitness',
  'games-and-activities',
  'graphic-books-and-manga',
  'hardcover-advice',
  'health',
  'humor',
  'indigenous-americans',
  'relationships',
  'science',
  'sports',
  'travel',
  'young-adult'
] as const;

// Export the error class for use in components
export { NytApiError };

// Resolve OG image for a given article URL via Netlify function
export async function resolveOgImage(
  articleUrl: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    if (!articleUrl || !/^https?:\/\//i.test(articleUrl)) return null;
    const endpoint = `/.netlify/functions/resolve-og-image?url=${encodeURIComponent(articleUrl)}`;
    const res = await fetch(endpoint, { signal, headers: { 'accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.image === 'string' ? data.image : null;
  } catch {
    return null;
  }
}
