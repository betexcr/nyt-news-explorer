import axios, { AxiosResponse } from "axios";

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
  signal?: AbortSignal
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await axios.get(url, {
      params: { ...baseParams(), ...params },
      signal,
    });
    return response.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new NytApiError('Request was cancelled', 0, 'ABORTED');
    }
    
    const status = error.response?.status;
    const message = error.response?.data?.fault?.faultstring || error.message;
    
    throw new NytApiError(
      `API request failed: ${message}`,
      status,
      error.code
    );
  }
}

// Type definitions for different APIs
export interface MostPopularArticle {
  id: number;
  url: string;
  adx_keywords: string;
  column: string | null;
  section: string;
  byline: string;
  type: string;
  title: string;
  abstract: string;
  published_date: string;
  source: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  media: Array<{
    type: string;
    subtype: string;
    caption: string;
    copyright: string;
    approved_for_syndication: number;
    "media-metadata": Array<{
      url: string;
      format: string;
      height: number;
      width: number;
    }>;
  }>;
  eta_id: number;
}

export interface TopStory {
  section: string;
  subsection: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;
  byline: string;
  item_type: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  material_type_facet: string;
  kicker: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  multimedia: Array<{
    rank: number;
    subtype: string;
    caption: string | null;
    credit: string | null;
    type: string;
    url: string;
    height: number;
    width: number;
    legacy: {
      xlarge: string;
      xlargewidth: number;
      xlargeheight: number;
    };
    subType: string;
    crop_name: string;
  }>;
  short_url: string;
}

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
  link: {
    type: string;
    url: string;
    suggested_link_text: string;
  };
  multimedia: {
    type: string;
    src: string;
    height: number;
    width: number;
  } | null;
}

export interface Book {
  rank: number;
  rank_last_week: number;
  weeks_on_list: number;
  asterisk: number;
  dagger: number;
  primary_isbn10: string;
  primary_isbn13: string;
  publisher: string;
  description: string;
  price: string;
  title: string;
  author: string;
  contributor: string;
  contributor_note: string;
  book_image: string;
  book_image_width: number;
  book_image_height: number;
  amazon_product_url: string;
  age_group: string;
  book_review_link: string;
  first_chapter_link: string;
  sunday_review_link: string;
  article_chapter_link: string;
  isbns: Array<{
    isbn10: string;
    isbn13: string;
  }>;
  buy_links: Array<{
    name: string;
    url: string;
  }>;
  book_uri: string;
}

export interface ArchiveArticle {
  web_url: string;
  snippet: string;
  lead_paragraph: string;
  abstract: string;
  print_page: number;
  blog: any[];
  source: string;
  multimedia: any[];
  headline: {
    main: string;
    kicker: string | null;
    content_kicker: string | null;
    print_headline: string | null;
    name: string | null;
    seo: string | null;
    sub: string | null;
  };
  keywords: Array<{
    name: string;
    value: string;
    rank: number;
    major: string;
  }>;
  pub_date: string;
  document_type: string;
  news_desk: string;
  section_name: string;
  subsection_name: string;
  byline: {
    original: string;
    person: Array<{
      firstname: string;
      middlename: string | null;
      lastname: string;
      qualifier: string | null;
      title: string | null;
      role: string;
      organization: string;
      rank: number;
    }>;
    organization: string | null;
  };
  type_of_material: string;
  _id: string;
  word_count: number;
  score: number;
  uri: string;
}

// API response types
export interface MostPopularResponse {
  status: string;
  copyright: string;
  num_results: number;
  results: MostPopularArticle[];
}

export interface TopStoriesResponse {
  status: string;
  copyright: string;
  section: string;
  last_updated: string;
  num_results: number;
  results: TopStory[];
}

export interface MovieReviewsResponse {
  status: string;
  copyright: string;
  has_more: boolean;
  num_results: number;
  results: MovieReview[];
}

export interface BooksResponse {
  status: string;
  copyright: string;
  num_results: number;
  last_modified: string;
  results: Book[];
}

export interface ArchiveResponse {
  status: string;
  copyright: string;
  response: {
    docs: ArchiveArticle[];
    meta: {
      hits: number;
      offset: number;
      time: number;
    };
  };
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
  const url = `${ENDPOINTS.ARCHIVE}/${year}/${month.toString().padStart(2, '0')}.json`;
  const response = await makeApiRequest<ArchiveResponse>(url, {}, signal);
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
