import axios from "axios";
import type { NytArticle } from "../types/nyt";

const API_KEY: string = process.env.REACT_APP_NYT_API_KEY ?? "";
const BASE_URL = "https://api.nytimes.com/svc/search/v2/articlesearch.json";

type NytSort = "newest" | "oldest";

function esc(str: string) {
  return String(str).replace(/"/g, '\\"');
}

function baseParams(): Record<string, string> {
  return { "api-key": API_KEY };
}

export async function searchArticles(
  query: string,
  signal?: AbortSignal
): Promise<NytArticle[]> {
  const q = (query || "").trim();
  if (!q) return [];
  const response = await axios.get(BASE_URL, {
    params: { ...baseParams(), q, page: 0 },
    signal,
  });
  const docs = response?.data?.response?.docs;
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
  const query: Record<string, string | number> = { ...baseParams(), q, page };
  if (sort) query.sort = sort;
  if (begin) query.begin_date = begin;
  if (end) query.end_date = end;
  if (section && section.trim()) {
    query.fq = `section_name:("${esc(section.trim())}")`;
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
    params: { ...baseParams(), fq: `web_url:("${esc(u)}")`, page: 0 },
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
