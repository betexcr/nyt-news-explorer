import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NytArticle } from "../types/nyt";

export type ViewMode = 'grid' | 'table';

interface AdvancedParams {
  query: string;
  sort: 'newest' | 'oldest';
  beginDate?: string;
  endDate?: string;
  section?: string;
  page: number;
}

type SearchState = {
  query: string;
  articles: NytArticle[];
  hasSearched: boolean;
  scrollY: number;
  viewMode: ViewMode;
  loading: boolean;
  totalResults: number;
  currentPage: number;
  hasMore: boolean;
  advancedParams: AdvancedParams | null;
  setQuery: (q: string) => void;
  setArticles: (a: NytArticle[]) => void;
  setHasSearched: (v: boolean) => void;
  setScrollY: (y: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setTotalResults: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setAdvancedParams: (params: AdvancedParams | null) => void;
  appendArticles: (articles: NytArticle[]) => void;
  reset: () => void;
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: "",
      articles: [],
      hasSearched: false,
      scrollY: 0,
      viewMode: 'grid',
      loading: false,
      totalResults: 0,
      currentPage: 0,
      hasMore: false,
      advancedParams: null,
      setQuery: (q) => set({ query: q }),
      setArticles: (a) => set({ articles: a }),
      setHasSearched: (v) => set({ hasSearched: v }),
      setScrollY: (y) => set({ scrollY: y }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (loading) => set({ loading }),
      setTotalResults: (total) => set({ totalResults: total }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setHasMore: (hasMore) => set({ hasMore }),
      setAdvancedParams: (params) => set({ advancedParams: params }),
      appendArticles: (newArticles) => {
        const { articles } = get();
        set({ articles: [...articles, ...newArticles] });
      },
      reset: () => set({ 
        query: "", 
        articles: [], 
        hasSearched: false, 
        scrollY: 0,
        viewMode: 'grid',
        loading: false,
        totalResults: 0,
        currentPage: 0,
        hasMore: false,
        advancedParams: null,
      }),
    }),
    {
      name: "search-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        query: s.query,
        articles: s.articles,
        hasSearched: s.hasSearched,
        scrollY: s.scrollY,
        viewMode: s.viewMode,
        advancedParams: s.advancedParams,
        totalResults: s.totalResults,
        currentPage: s.currentPage,
        hasMore: s.hasMore,
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure loading is false after rehydration
        if (state) {
          state.loading = false;
        }
      },
    }
  )
);