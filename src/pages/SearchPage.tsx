import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import { searchArticlesAdv, makeSearchController } from "../api/nyt";
import { debounce } from "../utils/debounce";
import ArticleCard from "../components/ArticleCard";
import ArticleTable from "../components/ArticleTable";
import VirtualizedArticleList from "../components/VirtualizedArticleList";
import ViewToggle from "../components/ViewToggle";
import Spinner from "../components/Spinner";
import "../styles/search.css";

type FromHomeState = { fromHome?: boolean };

const SECTIONS = [
  'Arts',
  'Books',
  'Business',
  'Climate',
  'Corrections',
  'Dining',
  'Education',
  'Fashion',
  'Food',
  'Health',
  'Learning',
  'Magazine',
  'Metro',
  'Movies',
  'Music',
  'National',
  'New York',
  'New York and Region',
  'Opinion',
  'Politics',
  'Real Estate',
  'Science',
  'Sports',
  'Style',
  'Sunday Review',
  'Technology',
  'Theater',
  'Travel',
  'U.S.',
  'Universal',
  'Washington',
  'Well',
  'World',
  'Your Money',
];

const SearchPage: React.FC = () => {
  const location = useLocation() as { state?: FromHomeState };
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    articles,
    hasSearched,
    scrollY,
    viewMode,
    loading,
    loadingMore,
    currentPage,
    hasMore,
    setQuery,
    setArticles,
    appendArticles,
    setHasSearched,
    setViewMode,
    setLoading,
    setLoadingMore,
    setHasMore,
    setAdvancedParams,
    reset,
  } = useSearchStore();

  // Debug: Log initial scroll position
  useEffect(() => {
    // Component mounted successfully
  }, [scrollY]);

  // Direct sessionStorage scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Restore scroll position from sessionStorage
      const savedScroll = sessionStorage.getItem('search-page-scroll');
      
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10);
        
        // Use multiple strategies to ensure restoration works
        const restoreScroll = () => {
          window.scrollTo(0, scrollY);
        };

        // Immediate restoration
        restoreScroll();

        // Delayed restoration for DOM readiness
        setTimeout(restoreScroll, 0);
        setTimeout(restoreScroll, 100);
        setTimeout(restoreScroll, 300);
        setTimeout(restoreScroll, 500);
        setTimeout(restoreScroll, 1000);
      }
    }
  }, [hasSearched, articles?.length]);

  // Additional restoration when content is fully loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && hasSearched && articles && articles.length > 0 && !loading) {
      const savedScroll = sessionStorage.getItem('search-page-scroll');
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10);
        
        // Wait for any animations or layout to complete
        const timer = setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 200);
        
        return () => clearTimeout(timer);
      }
    }
  }, [hasSearched, articles, loading]);

  // Save scroll position to sessionStorage
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Set new timeout to save after user stops scrolling
      scrollTimeout = setTimeout(() => {
        const currentScrollY = window.scrollY;
        // Only save if scroll position is meaningful (not 0 unless we're at the top)
        if (currentScrollY > 0 || document.documentElement.scrollTop === 0) {
          sessionStorage.setItem('search-page-scroll', currentScrollY.toString());
        }
      }, 150); // Save after 150ms of no scrolling
    };

    const handleBeforeUnload = () => {
      const currentScrollY = window.scrollY;
      // Always save on beforeunload
      sessionStorage.setItem('search-page-scroll', currentScrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentScrollY = window.scrollY;
        sessionStorage.setItem('search-page-scroll', currentScrollY.toString());
      }
    };

    const handlePageHide = () => {
      const currentScrollY = window.scrollY;
      sessionStorage.setItem('search-page-scroll', currentScrollY.toString());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        clearTimeout(scrollTimeout);
      };
    }
  }, []);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedForm, setAdvancedForm] = useState({
    sort: 'newest' as 'newest' | 'oldest',
    beginDate: '',
    endDate: '',
    section: '',
  });

  const runSearch = useMemo(() => makeSearchController(), []);

  const debouncedSearch = useMemo(
    () =>
      debounce((text: string) => {
        if (text.trim()) {
          setLoading(true);
          setHasSearched(true);
          runSearch(text.trim())
            .then((result) => {
              setArticles(result);
              setLoading(false);
            })
            .catch(() => {
              setArticles([]);
              setLoading(false);
            });
        }
      }, 500),
    [runSearch, setArticles, setLoading, setHasSearched]
  );

  const handleAdvancedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = (query || "").trim();
    if (!text) return;
    
    setLoading(true);
    setHasSearched(true);
    setAdvancedParams({ query: text, ...advancedForm });
    
    try {
      const result = await searchArticlesAdv({
        q: text,
        sort: advancedForm.sort,
        begin: advancedForm.beginDate || undefined,
        end: advancedForm.endDate || undefined,
        section: advancedForm.section || undefined,
        page: 0,
      });
      
      setArticles(result);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.fromHome && !hasSearched) {
      reset();
    }
  }, [location.state?.fromHome, hasSearched, reset]);

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      const originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      
      return () => {
        window.history.scrollRestoration = originalScrollRestoration;
      };
    }
  }, []);

  // Dynamic height calculation for virtualized list
  const [listHeight, setListHeight] = useState(600);
  const [itemHeight, setItemHeight] = useState(400);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerHeight = window.innerHeight - 200; // Account for header and padding
        setListHeight(Math.max(400, containerHeight));
        
        // Adjust item height based on viewport
        const viewportWidth = window.innerWidth;
        if (viewportWidth < 768) {
          setItemHeight(350); // Mobile
        } else if (viewportWidth < 1024) {
          setItemHeight(380); // Tablet
        } else {
          setItemHeight(400); // Desktop
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // ResizeObserver for more precise height updates
  useEffect(() => {
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      try {
        const resizeObserver = new ResizeObserver(() => {
          const containerHeight = window.innerHeight - 200;
          setListHeight(Math.max(400, containerHeight));
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
      } catch (error) {
        // Fallback if ResizeObserver is not available or fails
        // Silently handle the error to avoid test warnings
      }
    }
  }, [viewMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    debouncedSearch(v);
  };

  const handleAdvancedChange = (field: string, value: string) => {
    setAdvancedForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = (query || "").trim();
    if (!text) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const result = await runSearch(text);
      setArticles(result);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const text = (query || "").trim();
    if (!text) return;

    setLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const result = await searchArticlesAdv({
        q: text,
        page: nextPage,
        ...advancedForm
      });

      // For testing: 5 results per page
      if (result.length > 0) {
        appendArticles(result);
        // If we get less than 5 results, we've reached the end
        if (result.length < 5) {
          setHasMore(false);
        }
      } else {
        // No more results
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more articles:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, query, advancedForm, appendArticles, setHasMore, setLoadingMore]);

  // Add scroll detection for regular grid view
  useEffect(() => {
    if (!hasMore || loadingMore || !articles || articles.length < 5) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Trigger load more when user is near bottom
      if (documentHeight - scrollTop - windowHeight < 200) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, articles, handleLoadMore]);

  const renderResults = () => {
    if (loading) {
      return (
        <div className="panel loading">
          <Spinner />
          <p>Searching...</p>
        </div>
      );
    }

    if (!hasSearched) {
      return (
        <div className="panel empty">
          <h3>Search for articles</h3>
          <p>Enter a search term to find New York Times articles.</p>
        </div>
      );
    }

    if (!articles || articles.length === 0) {
      return (
        <div className="panel empty">
          <h3>No results found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      );
    }

    if (viewMode === 'table') {
      return <ArticleTable articles={articles} />;
    }

    // Use virtualization for grid view when there are many articles
    if (articles.length > 50) {
      return (
        <VirtualizedArticleList
          articles={articles}
          height={listHeight}
          itemHeight={itemHeight}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
        />
      );
    }

    return (
      <div className="grid results">
        {articles.map((a) => (
          <ArticleCard key={a.web_url} article={a} />
        ))}
        {loadingMore && (
          <div className="loading-more">
            <Spinner />
            <p>Loading more articles...</p>
          </div>
        )}
        {!hasMore && articles.length > 0 && (
          <div className="no-more-results">
            <p>No more articles to load</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef}>
      {/* Professional Search Row */}
      <div className="search-row">
        <div className="search-section">
          <form onSubmit={showAdvanced ? handleAdvancedSearch : handleSearch} className="searchbar">
            <div className="search-inputs">
              <input
                className="input"
                type="text"
                placeholder="Search articles"
                value={query}
                onChange={handleChange}
                aria-label="Search input"
              />
              
              {showAdvanced && (
                <>
                  <select
                    className="input"
                    value={advancedForm.sort}
                    onChange={(e) => handleAdvancedChange('sort', e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="relevance">Most Relevant</option>
                    <option value="best">Best Match</option>
                  </select>
                  
                  <select
                    className="input"
                    value={advancedForm.section}
                    onChange={(e) => handleAdvancedChange('section', e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {SECTIONS.map(section => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    className="input"
                    type="date"
                    value={advancedForm.beginDate}
                    onChange={(e) => handleAdvancedChange('beginDate', e.target.value)}
                    placeholder="Start Date"
                  />
                  
                  <input
                    className="input"
                    type="date"
                    value={advancedForm.endDate}
                    onChange={(e) => handleAdvancedChange('endDate', e.target.value)}
                    placeholder="End Date"
                  />
                </>
              )}
            </div>
            
            <div className="search-actions">
              <button type="submit" className="button">
                Search
              </button>
              <button 
                type="button" 
                className="button secondary"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Simple' : 'Advanced'}
              </button>
            </div>
          </form>
        </div>

        {hasSearched && articles && articles.length > 0 && (
          <div className="results-section">
            <div className="results-info">
              <span className="results-count">
                Showing {articles.length} results
              </span>
            </div>
            <ViewToggle
              viewMode={viewMode}
              onViewChange={setViewMode}
            />
          </div>
        )}
      </div>

      {/* Loading Spinner */}
      {loading && <Spinner />}

      {/* Results */}
      {!loading && hasSearched && renderResults()}
    </div>
  );
};

export default SearchPage;
