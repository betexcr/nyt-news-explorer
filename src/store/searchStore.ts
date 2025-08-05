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
}

type SearchState = {
  query: string;
  articles: NytArticle[];
  hasSearched: boolean;
  scrollY: number;
  viewMode: ViewMode;
  loading: boolean;
  loadingMore: boolean;
  currentPage: number;
  hasMore: boolean;
  advancedParams: AdvancedParams | null;
  setQuery: (q: string) => void;
  setArticles: (a: NytArticle[]) => void;
  appendArticles: (a: NytArticle[]) => void;
  setHasSearched: (v: boolean) => void;
  setScrollY: (y: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setAdvancedParams: (params: AdvancedParams | null) => void;
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
      loadingMore: false,
      currentPage: 0,
      hasMore: true,
      advancedParams: null,
      setQuery: (q) => set({ query: q }),
      setArticles: (a) => set({ 
        articles: a, 
        currentPage: 0, 
        // If we get less than 5 results, there are no more pages (for testing)
        hasMore: a.length === 5 
      }),
      appendArticles: (a) => set((state) => ({ 
        articles: [...state.articles, ...a],
        currentPage: state.currentPage + 1,
        // For testing: 5 results per page
        hasMore: a.length === 5
      })),
      setHasSearched: (v) => set({ hasSearched: v }),
      setScrollY: (y) => set({ scrollY: y }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (loading) => set({ loading }),
      setLoadingMore: (loadingMore) => set({ loadingMore }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setHasMore: (hasMore) => set({ hasMore }),
      setAdvancedParams: (params) => set({ advancedParams: params }),
      reset: () => set({ 
        query: "", 
        articles: [], 
        hasSearched: false, 
        scrollY: 0,
        viewMode: 'grid',
        loading: false,
        loadingMore: false,
        currentPage: 0,
        hasMore: true,
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
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure loading is false after rehydration
        if (state) {
          state.loading = false;
          state.loadingMore = false;
        }
      },
    }
  )
);