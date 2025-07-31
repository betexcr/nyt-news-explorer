import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { makeSearchController } from "../api/nyt";
import ArticleCard from "../components/ArticleCard";
import { debounce } from "../utils/debounce";
import { useSearchStore } from "../store/searchStore";
import "../styles/search.css";
import Spinner from "../components/Spinner";

function waitImages(selector: string, timeoutMs = 1500): Promise<void> {
  const imgs = Array.from(
    document.querySelectorAll<HTMLImageElement>(selector)
  );
  const waits = imgs.map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((res) => {
          const done = () => res();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
  );
  const timeout = new Promise<void>((res) => setTimeout(res, timeoutMs));
  return Promise.race([Promise.all(waits).then(() => undefined), timeout]);
}

type FromHomeState = { fromHome?: boolean };

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: FromHomeState };

  const {
    query,
    articles,
    hasSearched,
    scrollY,
    setQuery,
    setArticles,
    setHasSearched,
    setScrollY,
    reset,
  } = useSearchStore();

  const [loading, setLoading] = useState(false);
  const runSearch = useMemo(() => makeSearchController(), []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        const text = (q || "").trim();
        setHasSearched(true);
        if (!text) {
          setArticles([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const result = await runSearch(text);
          setArticles(result);
        } catch {
          setArticles([]);
        } finally {
          setLoading(false);
        }
      }, 350),
    [runSearch, setArticles, setHasSearched]
  );

  useEffect(() => {
    if (location.state?.fromHome) {
      reset();
      navigate(".", { replace: true, state: null });
    }
  }, [location.state, reset, navigate]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setScrollY]);

  useEffect(() => {
    if (!articles?.length) return;
    if (!scrollY || scrollY <= 0) return;
    let cancelled = false;
    (async () => {
      await waitImages(".thumb", 1500);
      if (!cancelled) window.scrollTo(0, scrollY);
    })();
    return () => {
      cancelled = true;
    };
  }, [articles, scrollY]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    debouncedSearch(v);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = (query || "").trim();
    setHasSearched(true);
    if (!text) {
      setArticles([]);
      return;
    }
    setLoading(true);
    try {
      const result = await runSearch(text);
      setArticles(result); // fixed
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="searchbar">
        <input
          className="input"
          type="text"
          placeholder="Search articles"
          value={query}
          onChange={handleChange}
          aria-label="Search input"
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>
      {loading && <Spinner />}

      {!loading && hasSearched && (!articles || articles.length === 0) && (
        <div className="panel empty">No results</div>
      )}

      <div className="grid results">
        {(articles ?? []).map((a) => (
          <ArticleCard key={a._id} article={a} />
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
