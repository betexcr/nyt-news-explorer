import axios, { AxiosResponse } from "axios";
import type {
  MostPopularArticle,
  MostPopularResponse,
  TopStory,
  TopStoriesResponse,
  Book,
  BooksResponse,
  ArchiveArticle,
  ArchiveResponse,
} from "../types/nyt.other";
export type { MostPopularArticle, TopStory, Book, ArchiveArticle } from "../types/nyt.other";

// Base configuration
const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";
const BASE_URL = "https://api.nytimes.com/svc";

// API endpoints
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

// Generic API request function with error handling
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
  const response = await makeApiRequest<BooksResponse>(url, {}, signal);
  return response.results;
}

// Archive API
export async function getArchive(
  year: number,
  month: number,
  signal?: AbortSignal
): Promise<ArchiveArticle[]> {
  // Call NYT API directly; this endpoint supports CORS and can be large, so allow more time
  const url = `${ENDPOINTS.ARCHIVE}/${year}/${month}.json`;
  const response = await makeApiRequest<ArchiveResponse>(url, {}, signal, { timeoutMs: 20000 });
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
