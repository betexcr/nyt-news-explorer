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
  favorites: NytArticle[];
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
  addFavorite: (article: NytArticle) => void;
  removeFavorite: (articleUrl: string) => void;
  clearFavorites: () => void;
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
      favorites: [],
      setQuery: (q) => set({ query: q }),
      setArticles: (a) => set({ 
        articles: a, 
        currentPage: 0, 
        // If we get less than 6 results, there are no more pages (for testing)
        hasMore: a.length === 6 
      }),
      appendArticles: (a) => set((state) => ({ 
        articles: [...state.articles, ...a],
        currentPage: state.currentPage + 1,
        // For testing: 6 results per page
        hasMore: a.length === 6
      })),
      setHasSearched: (v) => set({ hasSearched: v }),
      setScrollY: (y) => set({ scrollY: y }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (loading) => set({ loading }),
      setLoadingMore: (loadingMore) => set({ loadingMore }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setHasMore: (hasMore) => set({ hasMore }),
      setAdvancedParams: (params) => set({ advancedParams: params }),
      addFavorite: (article) => set((state) => ({ favorites: [...state.favorites, article] })),
      removeFavorite: (articleUrl) => set((state) => ({ 
        favorites: state.favorites.filter(article => article.web_url !== articleUrl) 
      })),
      clearFavorites: () => set({ favorites: [] }),
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
        favorites: [],
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
        favorites: s.favorites,
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