import axios from "axios";
import type { NytArticle } from "../types/nyt";

const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";

// Use proxy in development, direct API in production
const isDevelopment = process.env.NODE_ENV === 'development';
const BASE_URL = isDevelopment 
  ? "/svc/search/v2/articlesearch.json"
  : "https://api.nytimes.com/svc/search/v2/articlesearch.json";

// Fallback CORS proxy for development if proxy doesn't work
const CORS_PROXY_URL = "https://cors-anywhere.herokuapp.com/https://api.nytimes.com/svc/search/v2/articlesearch.json";

// Function to get the appropriate API URL with fallback
function getApiUrl(): string {
  if (isDevelopment) {
    return BASE_URL;
  }
  return BASE_URL;
}

// Function to make API request with fallback
async function makeApiRequest(params: Record<string, string | number>, signal?: AbortSignal) {
  try {
    // Try the primary URL first
    const response = await axios.get(getApiUrl(), { params, signal });
    return response;
  } catch (error: any) {
    // If it's a CORS error and we're in development, try the proxy
    if (isDevelopment && error.message?.includes('CORS') && CORS_PROXY_URL) {
      console.warn('CORS error detected, trying fallback proxy...');
      const proxyResponse = await axios.get(CORS_PROXY_URL, { params, signal });
      return proxyResponse;
    }
    throw error;
  }
}

type NytSort = "newest" | "oldest" | "best" | "relevance";

function esc(str: string) {
  return String(str).replace(/"/g, '\\"');
}

function baseParams(): Record<string, string> {
  return { 
    "api-key": API_KEY,
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
  
  const params = { 
    ...baseParams(), 
    q, 
    "page": 0
  };
  
  const response = await makeApiRequest(params, signal);
  
  const docs = response?.data?.response?.docs;
  // For testing: return first 12 results to simulate page size
  const limitedDocs = Array.isArray(docs) ? docs.slice(0, 12) : [];
  
  return limitedDocs as NytArticle[];
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
  const query: Record<string, string | number> = { 
    ...baseParams(), 
    q, 
    "page": page
  };
  
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
  
  const response = await makeApiRequest(query, signal);
  const docs = response?.data?.response?.docs;
  
  // For testing: return first 12 results to simulate page size
  const limitedDocs = Array.isArray(docs) ? docs.slice(0, 12) : [];
  
  return limitedDocs as NytArticle[];
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
