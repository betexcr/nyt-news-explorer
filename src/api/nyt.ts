import axios from "axios";
import type { NytArticle } from "../types/nyt";

const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";
const BASE_URL = "https://api.nytimes.com/svc/search/v2/articlesearch.json";

type NytSort = "newest" | "oldest";

function esc(str: string) {
  return String(str).replace(/"/g, '\\"');
}

function baseParams(): Record<string, string> {
  return { 
    "api-key": API_KEY,
    // NYT API appears to limit results to 10 per page regardless of rows parameter
    // We'll work with this limitation and use pagination
  };
}

// Mapping from our section names to NYT API news_desk values
const SECTION_TO_NEWS_DESK: Record<string, string> = {
  'U.S.': 'Washington',
  'World': 'Foreign',
  'Business': 'Business',
  'Technology': 'Technology',
  'Science': 'Science',
  'Health': 'Health',
  'Sports': 'Sports',
  'Arts': 'Arts',
  'Style': 'Style',
  'Food': 'Food',
  'Travel': 'Travel',
  'Real Estate': 'Real Estate',
  'Education': 'Education',
  'Opinion': 'Opinion',
  'Politics': 'Washington',
  'National': 'National',
  'Metro': 'Metro',
  'New York': 'Metro',
  'New York and Region': 'Metro',
};

export async function searchArticles(
  query: string,
  signal?: AbortSignal
): Promise<NytArticle[]> {
  const q = (query || "").trim();
  if (!q) return [];
  
  // NYT API is limited to 10 results per page
  const params = { 
    ...baseParams(), 
    q, 
    "page": 0
  };
  
  const response = await axios.get(BASE_URL, {
    params,
    signal,
  });
  
  const docs = response?.data?.response?.docs;
  return Array.isArray(docs) ? (docs as NytArticle[]) : [];
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
  if (sort) query.sort = sort;
  if (begin) query.begin_date = begin;
  if (end) query.end_date = end;
  if (section && section.trim()) {
    const newsDeskValue = SECTION_TO_NEWS_DESK[section.trim()] || section.trim();
    const sectionValue = esc(newsDeskValue);
    query.fq = `news_desk:("${sectionValue}")`;
  }
  
  const response = await axios.get(BASE_URL, { params: query, signal });
  const docs = response?.data?.response?.docs;
  
  return Array.isArray(docs) ? (docs as NytArticle[]) : [];
}

export async function getArticleByUrl(
  url: string,
  signal?: AbortSignal
): Promise<NytArticle | null> {
  const u = (url || "").trim();
  if (!u) return null;
  const response = await axios.get(BASE_URL, {
    params: { 
      ...baseParams(), 
      fq: `web_url:("${esc(u)}")`, 
      "page": 0
    },
    signal,
  });
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
