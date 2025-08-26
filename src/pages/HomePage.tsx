import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import type { MostPopularArticle, TopStory } from "../types/nyt.other";
import { mockTrendingArticles, mockTopStories } from "../api/mock-data";
import { getMostPopular, getTopStories, searchArticlesByDay } from "../api/nyt-apis";
import type { ArchiveArticle } from "../types/nyt.other";
import { formatDate } from "../utils/format";
// Spinner not used on Home; hero renders immediately
import "../styles/home.css";

const HomePage: React.FC = () => {
  const reset = useSearchStore((state) => state.reset);
  const [trendingArticles, setTrendingArticles] = useState<MostPopularArticle[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);
  // No blocking loading state for Home hero
  const [todayInHistory, setTodayInHistory] = useState<ArchiveArticle[]>([]);
  // Keep local error handling but do not surface in UI
  const [, setError] = useState<string | null>(null);
  // Prevent duplicate fetches in React 18 StrictMode dev double-invoke
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    const USE_MOCK = !process.env.REACT_APP_NYT_API_KEY;

    const fetchHomeData = async () => {
      // Clear any previous error
      setError(null);
      try {
        if (USE_MOCK) {
          setTrendingArticles(mockTrendingArticles.slice(0, 3));
          setTopStories(mockTopStories.slice(0, 3));
          setTodayInHistory([]);
        } else {
          const now = new Date();

          const [popular, stories] = await Promise.all([
            getMostPopular('7'),
            getTopStories('home'),
          ]);
          setTrendingArticles(popular.slice(0, 3));
          setTopStories(stories.slice(0, 3));
          // Fetch "A day like today" items in the background (exact day, 3 random past years)

          const desiredCount = 3;
          const targetDay = now.getUTCDate();
          const cacheKey = `archiveToday:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${targetDay}`;
          const cached = safeReadCache(cacheKey, 3600); // 1 hour
          if (cached && Array.isArray(cached.results) && cached.results.length >= desiredCount) {
            setTodayInHistory(cached.results.slice(0, desiredCount));
          } else {
            (async () => {
              try {
                const month = now.getUTCMonth() + 1; // 1-12
                const currentYear = now.getUTCFullYear();
                const START_YEAR = 1851;
                const minYear = month < 10 ? START_YEAR + 1 : START_YEAR; // Archive starts Oct 1851
                // Build and shuffle pool of candidate years (exclude current)
                const pool: number[] = [];
                for (let y = currentYear - 1; y >= minYear; y -= 1) pool.push(y);
                for (let i = pool.length - 1; i > 0; i -= 1) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                const picks: ArchiveArticle[] = [];
                let idx = 0;
                // Fetch one year at a time until we have 3 stories or we exhaust a reasonable number of attempts
                const maxAttempts = Math.min(pool.length, 24);
                while (picks.length < desiredCount && idx < maxAttempts) {
                  const batchYears = pool.slice(idx, idx + Math.min(3, maxAttempts - idx));
                  idx += batchYears.length;
                  const results = await Promise.allSettled(
                    batchYears.map(async (y) => {
                      const m = month;
                      // Use Article Search for a single exact day to minimize payload
                      const docs = await searchArticlesByDay(y, m, targetDay);
                      if (!Array.isArray(docs) || docs.length === 0) return null;
                      return docs[Math.floor(Math.random() * docs.length)];
                    })
                  );
                  for (const r of results) {
                    if (r.status === 'fulfilled' && r.value && picks.length < desiredCount) picks.push(r.value as ArchiveArticle);
                  }
                }
                setTodayInHistory(picks.slice(0, desiredCount));
                safeWriteCache(cacheKey, { results: picks.slice(0, desiredCount) });
              } catch {
                // ignore
              }
            })();
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch home data');
      } finally {
        // no-op
      }
    };

    fetchHomeData();
    return () => {};
  }, []);

  const handleHomeClick = () => {
    reset();
  };

  const getImageUrl = (article: MostPopularArticle | TopStory): string => {
    // Most Popular
    if ('media' in article && article.media && article.media.length > 0) {
      const media = article.media[0];
      const mm = (media as any)['media-metadata'] || [];
      const preferred =
        mm.find((m: any) => /^(Large|superJumbo|mediumThreeByTwo440)$/i.test(m.format)) ||
        mm.find((m: any) => /^(mediumThreeByTwo210|Large Thumbnail)$/i.test(m.format)) ||
        mm.find((m: any) => /^(Standard Thumbnail)$/i.test(m.format)) ||
        mm[0];
      if (preferred?.url) return preferred.url;
    }

    // Top Stories
    if ('multimedia' in article && article.multimedia && article.multimedia.length > 0) {
      const media = article.multimedia[0] as any;
      if (media?.legacy?.xlarge) return media.legacy.xlarge;
      if (media?.url) return media.url;
    }

    return '/logo.png';
  };

  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    return /^(https?:)?\/\//i.test(url) ? url : null;
  };

  // Always render hero immediately; below content shows as it loads

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="hero-content">
          <h1 className="hero-title">NYT News Explorer</h1>
          <p className="hero-subtitle">Discover the latest news from The New York Times</p>
          
          <div className="hero-actions">
            <Link to="/search" className="hero-button primary" onClick={handleHomeClick}>
              Search Articles
            </Link>
            <Link to="/archive" className="hero-button secondary">
              Explore Archive
            </Link>
          </div>
        </div>
        
        <div className="hero-image">
          <picture>
            <source
              type="image/avif"
              srcSet="/home-hero-800.avif 800w,
              /home-hero-1200.avif 1200w,
              /home-hero-1600.avif 1600w,
              /home-hero-2400.avif 2400w"
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet="/home-hero-800.webp 800w,
              /home-hero-1200.webp 1200w,
              /home-hero-1600.webp 1600w,
              /home-hero-2400.webp 2400w"
              sizes="100vw"
            />
            <img
              src="/home-hero.jpg"  
              srcSet="/home-hero-800.jpg 800w,
              /home-hero-1200.jpg 1200w,
              /home-hero-1600.jpg 1600w,
              /home-hero-2400.jpg 2400w"
              sizes="100vw"
              alt="New York Times News Explorer"
              className="home-hero"
              fetchPriority="high"
              decoding="sync" 
            />
          </picture>
        </div>
      </section>

      {/* Error messages hidden per request */}

      {/* Featured Content Section */}
      <section className="featured-content">
        <div className="content-grid">
          {/* Trending Articles */}
          <div className="content-section trending-section">
            <div className="section-header">
              <h2>Trending This Week</h2>
              <Link to="/trending" className="view-all-link">View All →</Link>
            </div>
            
            <div className="articles-grid">
              {trendingArticles.map((article, index) => {
                const href = getSafeUrl(article.url) || undefined;
                const handleOpen = () => {
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                };
                const handleKey = (e: React.KeyboardEvent) => {
                  if ((e.key === 'Enter' || e.key === ' ') && href) {
                    e.preventDefault();
                    handleOpen();
                  }
                };
                return (
                <article
                  key={article.id}
                  className="article-card trending-card"
                  role={href ? 'link' : undefined}
                  tabIndex={href ? 0 : -1}
                  aria-label={href ? `Open: ${article.title}` : undefined}
                  onClick={handleOpen}
                  onKeyDown={handleKey}
                >
                  <div className="article-image">
                    <img
                      src={getImageUrl(article)}
                      alt={article.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="trending-badge">
                      <span>#{index + 1}</span>
                    </div>
                  </div>
                  
                  <div className="article-content">
                    <div className="article-meta">
                      <span className="section">{article.section}</span>
                      <span className="date">{formatDate(article.published_date)}</span>
                    </div>
                    
                    <h3 className="article-title">{article.title}</h3>
                    
                    <p className="article-abstract">{article.abstract}</p>
                    
                    <div className="article-footer">
                      <span className="byline">{article.byline}</span>
                    </div>
                  </div>
                </article>
              );})}
            </div>
          </div>

          {/* Top Stories */}
          <div className="content-section top-stories-section">
            <div className="section-header">
              <h2>Top Stories</h2>
              <Link to="/top-stories" className="view-all-link">View All →</Link>
            </div>
            
            <div className="articles-grid">
              {topStories.map((story, _index) => {
                const href = getSafeUrl(story.url) || undefined;
                const handleOpen = () => {
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                };
                const handleKey = (e: React.KeyboardEvent) => {
                  if ((e.key === 'Enter' || e.key === ' ') && href) {
                    e.preventDefault();
                    handleOpen();
                  }
                };
                return (
                <article
                  key={story.uri}
                  className="article-card story-card"
                  role={href ? 'link' : undefined}
                  tabIndex={href ? 0 : -1}
                  aria-label={href ? `Open: ${story.title}` : undefined}
                  onClick={handleOpen}
                  onKeyDown={handleKey}
                >
                  <div className="article-image">
                    <img
                      src={getImageUrl(story)}
                      alt={story.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="story-badge">
                      <span>Top Story</span>
                    </div>
                  </div>
                  
                  <div className="article-content">
                    <div className="article-meta">
                      <span className="section">{story.section}</span>
                      <span className="date">{formatDate(story.published_date)}</span>
                    </div>
                    
                    <h3 className="article-title">{story.title}</h3>
                    
                    <p className="article-abstract">{story.abstract}</p>
                    
                    <div className="article-footer">
                      <span className="byline">{story.byline}</span>
                    </div>
                  </div>
                </article>
              );})}
            </div>
          </div>

          {/* A day like today */}
          <div className="content-section today-like-section" style={{ gridColumn: '1 / -1' }}>
            <div className="section-header">
              <h2>A day like today…</h2>
              <Link to="/archive" className="view-all-link">Go to Archive →</Link>
            </div>
            {todayInHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No highlights available for today.</p>
            ) : (
              <div className="articles-grid">
                {todayInHistory.map((a) => {
                  const href = getSafeUrl(a.web_url) || undefined;
                  const handleOpen = () => {
                    if (href) window.open(href, '_blank', 'noopener,noreferrer');
                  };
                  const handleKey = (e: React.KeyboardEvent) => {
                    if ((e.key === 'Enter' || e.key === ' ') && href) {
                      e.preventDefault();
                      handleOpen();
                    }
                  };
                  return (
                    <article
                      key={a.uri}
                      className="article-card story-card"
                      role={href ? 'link' : undefined}
                      tabIndex={href ? 0 : -1}
                      aria-label={href ? `Open: ${a.headline?.main || a.abstract}` : undefined}
                      onClick={handleOpen}
                      onKeyDown={handleKey}
                    >
                      {/* Archive: no preview images by design */}
                      <div className="article-content">
                        <div className="article-meta">
                          <span className="section">{a.section_name || a.news_desk || 'Archive'}</span>
                          <span className="date">{new Date(a.pub_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                        </div>
                        <h3 className="article-title">{a.headline?.main || a.abstract}</h3>
                        <p className="article-abstract">{a.snippet || a.lead_paragraph || ''}</p>
                        <div className="article-footer">
                          <span className="byline">{a.byline?.original || ''}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Explore More</h2>
        <div className="actions-grid">
          <Link to="/search" className="action-card" onClick={handleHomeClick}>
            <div className="action-icon" aria-hidden="true" />
            <h3>Search Articles</h3>
            <p>Find specific articles with advanced filters</p>
          </Link>
          
          <Link to="/trending" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Trending</h3>
            <p>Most popular articles this week</p>
          </Link>
          
          <Link to="/top-stories" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Top Stories</h3>
            <p>Latest top stories by section</p>
          </Link>
          
          <Link to="/archive" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Archive</h3>
            <p>Browse history back to Oct 1, 1851</p>
          </Link>
          
          <Link to="/favorites" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Favorites</h3>
            <p>Your saved articles</p>
          </Link>
          
          <Link to="/api-docs" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>API Docs</h3>
            <p>Interactive API documentation</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

// Simple cache helpers
function safeReadCache(key: string, maxAgeSeconds: number): any | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const ts = typeof parsed._ts === 'number' ? parsed._ts : 0;
    if (Date.now() - ts > maxAgeSeconds * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function safeWriteCache(key: string, data: any): void {
  try {
    const payload = { _ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}
