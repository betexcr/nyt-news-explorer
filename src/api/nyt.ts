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
    // Try without field list to see if that's causing issues
    // "fl": "web_url,headline,abstract,byline,multimedia,news_desk,print_page,print_section,pub_date,section_name,snippet,source,subsection_name,type_of_material,uri,word_count,_id,lead_paragraph"
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
  
  // Try different approaches to get more results
  const params = { 
    ...baseParams(), 
    q, 
    // Try using page instead of offset
    "page": 0,
    // Try different row values - start with 20 to see if we can get more than 10
    "rows": 20
  };
  
  console.log('API Request params:', params);
  
  const response = await axios.get(BASE_URL, {
    params,
    signal,
  });
  
  const docs = response?.data?.response?.docs;
  const totalHits = response?.data?.response?.meta?.hits;
  const meta = response?.data?.response?.meta;
  
  console.log('API Response:', {
    totalHits,
    resultsReturned: docs?.length || 0,
    page: meta?.offset || 0,
    requestedRows: 20,
    meta: meta
  });
  
  // If we only get 10 results, try a different approach
  if (docs?.length === 10 && totalHits > 10) {
    console.log('Only got 10 results despite requesting 20. Trying alternative approach...');
    
    // Try with different parameters
    const altParams = { 
      ...baseParams(), 
      q, 
      "page": 0,
      "rows": 15, // Try a different number
      "sort": "newest" // Add sorting to see if it helps
    };
    
    try {
      const altResponse = await axios.get(BASE_URL, {
        params: altParams,
        signal,
      });
      
      const altDocs = altResponse?.data?.response?.docs;
      const altTotalHits = altResponse?.data?.response?.meta?.hits;
      
      console.log('Alternative API Response:', {
        totalHits: altTotalHits,
        resultsReturned: altDocs?.length || 0,
        requestedRows: 15
      });
      
      // Use the alternative response if it has more results
      if (altDocs && altDocs.length > docs.length) {
        return Array.isArray(altDocs) ? (altDocs as NytArticle[]) : [];
      }
    } catch (error) {
      console.log('Alternative approach failed:', error);
    }
  }
  
  return Array.isArray(docs) ? (docs as NytArticle[]) : [];
}

// Advanced search with pagination, sorting, and date filters... Added for completeness
// This is not used in the app but can be useful for more complex queries.
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
    // Try using page instead of offset
    "page": page,
    // Try different row values
    "rows": 20
  };
  if (sort) query.sort = sort;
  if (begin) query.begin_date = begin;
  if (end) query.end_date = end;
      if (section && section.trim()) {
      const newsDeskValue = SECTION_TO_NEWS_DESK[section.trim()] || section.trim();
      const sectionValue = esc(newsDeskValue);
      query.fq = `news_desk:("${sectionValue}")`;
    }
  
  console.log('Advanced API Request params:', query);
  
  const response = await axios.get(BASE_URL, { params: query, signal });
  const docs = response?.data?.response?.docs;
  const totalHits = response?.data?.response?.meta?.hits;
  const meta = response?.data?.response?.meta;
  
  console.log('Advanced API Response:', {
    totalHits,
    resultsReturned: docs?.length || 0,
    page: meta?.offset || 0,
    requestedRows: 20,
    meta: meta
  });
  
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
      "page": 0,
      "rows": 1
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
