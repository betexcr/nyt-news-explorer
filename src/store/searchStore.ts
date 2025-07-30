import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NytArticle } from "../types/nyt";

type SearchState = {
  query: string;
  articles: NytArticle[];
  hasSearched: boolean;
  scrollY: number;
  setQuery: (q: string) => void;
  setArticles: (a: NytArticle[]) => void;
  setHasSearched: (v: boolean) => void;
  setScrollY: (y: number) => void;
  reset: () => void;
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: "",
      articles: [],
      hasSearched: false,
      scrollY: 0,
      setQuery: (q) => set({ query: q }),
      setArticles: (a) => set({ articles: a }),
      setHasSearched: (v) => set({ hasSearched: v }),
      setScrollY: (y) => set({ scrollY: y }),
      reset: () => set({ query: "", articles: [], hasSearched: false, scrollY: 0 }),
    }),
    {
      name: "search-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        query: s.query,
        articles: s.articles,
        hasSearched: s.hasSearched,
        scrollY: s.scrollY,
      }),
    }
  )
);