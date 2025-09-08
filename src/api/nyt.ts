import axios from "axios";
import type { NytArticle } from "../types/nyt";

// Custom error types for API responses
export class NytApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'NytApiError';
  }
}

export class NytRateLimitError extends NytApiError {
  constructor() {
    super(
      'API rate limit exceeded. Please wait a moment before making another request.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
    this.name = 'NytRateLimitError';
  }
}

const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";

// Always use NYT API directly
const isDevelopment = process.env.NODE_ENV === 'development';
const BASE_URL = "/svc/search/v2/articlesearch.json";
const ABSOLUTE_URL = "https://api.nytimes.com/svc/search/v2/articlesearch.json";

// Fallback CORS proxy for development if proxy doesn't work
const CORS_PROXY_URL = "https://cors-anywhere.herokuapp.com/https://api.nytimes.com/svc/search/v2/articlesearch.json";

// Function to get the appropriate API URL with fallback
function getApiUrl(): string {
  // In development, CRA proxy forwards /svc to https://api.nytimes.com
  // In production, we must call NYT directly
  return isDevelopment ? BASE_URL : ABSOLUTE_URL;
}

// Function to make API request with fallback
async function makeApiRequest(params: Record<string, string | number>, signal?: AbortSignal) {
  try {
    // Try the primary URL first
    const response = await axios.get(getApiUrl(), { params, signal });
    return response;
  } catch (error: any) {
    // Check for rate limit error in response - check multiple possible paths
    const responseData = error.response?.data;
    const isRateLimitError = 
      responseData?.fault?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
      responseData?.fault?.fault?.errorcode === 'policies.ratelimit.QuotaViolation' ||
      responseData?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
      responseData?.fault?.errorcode === 'policies.ratelimit.QuotaViolation';
    
    if (isRateLimitError) {
      throw new NytRateLimitError();
    }
    
    // If it's a CORS error and we're in development, try the proxy
    if (isDevelopment && error.message?.includes('CORS') && CORS_PROXY_URL) {
      console.warn('CORS error detected, trying fallback proxy...');
      try {
        const proxyResponse = await axios.get(CORS_PROXY_URL, { params, signal });
        return proxyResponse;
      } catch (proxyError: any) {
        // Check for rate limit error in proxy response too - check multiple possible paths
        const proxyResponseData = proxyError.response?.data;
        const isProxyRateLimitError = 
          proxyResponseData?.fault?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
          proxyResponseData?.fault?.fault?.errorcode === 'policies.ratelimit.QuotaViolation' ||
          proxyResponseData?.fault?.detail?.errorcode === 'policies.ratelimit.QuotaViolation' ||
          proxyResponseData?.fault?.errorcode === 'policies.ratelimit.QuotaViolation';
        
        if (isProxyRateLimitError) {
          throw new NytRateLimitError();
        }
        throw proxyError;
      }
    }
    throw error;
  }
}

// (removed unused makeNytApiRequest helper)

type NytSort = "newest" | "oldest" | "best" | "relevance";

function esc(str: string) {
  return String(str).replace(/"/g, '\\"');
}

function baseParams(): Record<string, string> {
  return { 
    "api-key": API_KEY,
    "fl": "web_url,headline,abstract,byline,multimedia,pub_date,section_name,subsection_name",
  };
}

// Mapping from our section names to NYT API desk values
const SECTION_TO_DESK: Record<string, string> = {
  'U.S.': 'Washington',
  'World': 'Foreign',
  'Business': 'Business',
  'Technology': 'Technology',
  'Science': 'Science',
  'Health': 'Health',
  'Sports': 'Sports',
  'Arts': 'Arts',
  'Style': 'Styles',
  'Food': 'Dining',
  'Travel': 'Travel',
  'Real Estate': 'RealEstate',
  'Education': 'Learning',
  'Opinion': 'OpEd',
  'Politics': 'Politics',
  'National': 'National',
  'Metro': 'Metro',
  'New York': 'Metro',
  'New York and Region': 'Metro',
  'Books': 'BookReview',
  'Movies': 'Movies',
  'Theater': 'Theater',
  'Music': 'Arts',
  'Dining': 'Dining',
  'Fashion': 'Styles',
  'Well': 'Well',
  'Climate': 'Climate',
  'Corrections': 'Corrections',
  'Magazine': 'Magazine',
  'Sunday Review': 'SundayReview',
  'The Upshot': 'TheUpshot',
  'Today\'s Paper': 'TodayPaper',
  'Universal': 'Universal',
  'Your Money': 'YourMoney',
};

// Convert date from YYYY-MM-DD to YYYYMMDD format
function formatDateForAPI(dateString: string): string {
  if (!dateString) return '';
  return dateString.replace(/-/g, '');
}

export async function searchArticles(
  query: string,
  signal?: AbortSignal
): Promise<NytArticle[]> {
  const q = (query || "").trim();
  if (!q) return [];
  
  // Always use NYT API request function
  const requestFn = makeApiRequest;
  
  // Make two requests to get 12 results total
  const params1 = { ...baseParams(), q, "page": 0 };
  const params2 = { ...baseParams(), q, "page": 1 };
  
  try {
    // Make requests sequentially to better handle individual errors
    const response1 = await requestFn(params1, signal);
    const docs1 = response1?.data?.response?.docs || [];
    
    // If first request succeeds, try second request
    let docs2: any[] = [];
    try {
      const response2 = await requestFn(params2, signal);
      docs2 = response2?.data?.response?.docs || [];
    } catch (secondError: any) {
      // If second request fails with rate limit, we still have results from first
      if (secondError instanceof NytRateLimitError) {
        return docs1 as NytArticle[];
      }
      // For other errors, continue with empty docs2
    }
    
    // Combine results: 10 from page 0 + 2 from page 1 = 12 total
    const combinedDocs = [...docs1, ...docs2.slice(0, 2)];
    
    return combinedDocs as NytArticle[];
  } catch (error: any) {
    // If it's a rate limit error, re-throw it
    if (error instanceof NytRateLimitError) {
      throw error;
    }
    
    // If it's an abort error, re-throw it
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw error;
    }
    
    // If parallel requests fail for other reasons, fall back to single request
    try {
      const response = await requestFn(params1, signal);
      const docs = response?.data?.response?.docs;
      return Array.isArray(docs) ? docs : [];
    } catch (fallbackError: any) {
      // If fallback also fails with rate limit, re-throw it
      if (fallbackError instanceof NytRateLimitError) {
        throw fallbackError;
      }
      // If fallback also fails with abort error, re-throw it
      if (fallbackError.name === 'AbortError' || fallbackError.message?.includes('aborted')) {
        throw fallbackError;
      }
      // For other errors, return empty array
      return [];
    }
  }
}

// Advanced search with pagination, sorting, and date filters
export async function searchArticlesAdv(params: {
  q: string;
  page?: number;
  sort?: NytSort;
  begin?: string;
  end?: string;
  section?: string;
  signal?: AbortSignal;
}): Promise<NytArticle[]> {
  const { q, page = 0, sort, begin, end, section, signal } = params;
  
  // Always use NYT API request function
  const requestFn = makeApiRequest;
  
  const query: Record<string, string | number> = { ...baseParams(), q, "page": page };
  
  // Add sort parameter
  if (sort) query.sort = sort;
  
  // Add date filters (convert from YYYY-MM-DD to YYYYMMDD)
  if (begin) query.begin_date = formatDateForAPI(begin);
  if (end) query.end_date = formatDateForAPI(end);
  
  // Add section filter using desk field
  if (section && section.trim()) {
    const deskValue = SECTION_TO_DESK[section.trim()];
    if (deskValue) {
      query.fq = `desk:("${esc(deskValue)}")`;
    }
  }
  
  try {
    const response = await requestFn(query, signal);
    const docs = response?.data?.response?.docs;
    
    // Return all results from the API (NYT API has its own pagination)
    return Array.isArray(docs) ? docs : [];
  } catch (error) {
    // If it's a rate limit error, re-throw it
    if (error instanceof NytRateLimitError) {
      throw error;
    }
    // For other errors, return empty array
    return [];
  }
}

export async function getArticleByUrl(
  url: string,
  signal?: AbortSignal
): Promise<NytArticle | null> {
  const u = (url || "").trim();
  if (!u) return null;
  const response = await makeApiRequest({ 
    ...baseParams(), 
    fq: `web_url:("${esc(u)}")`, 
    "page": 0
  }, signal);
  const docs = response?.data?.response?.docs;
  if (Array.isArray(docs) && docs.length > 0) return docs[0] as NytArticle;
  return null;
}

export function makeSearchController() {
  let ctrl: AbortController | null = null;
  return async (q: string) => {
    ctrl?.abort();
    ctrl = new AbortController();
    return searchArticles(q, ctrl.signal);
  };
}
