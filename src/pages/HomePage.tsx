import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import type { MostPopularArticle, TopStory, ArchiveArticle } from "../types/nyt.other";
import { mockTrendingArticles, mockTopStories, mockArchiveArticles } from "../api/mock-data";
import { getMostPopular, getTopStories, searchArticlesByDay } from "../api/nyt-apis";
import { formatDate } from "../utils/format";
// Spinner not used on Home; hero renders immediately
import "../styles/home.css";

const HomePage: React.FC = () => {
  const reset = useSearchStore((state) => state.reset);
  const [trendingArticles, setTrendingArticles] = useState<MostPopularArticle[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);
  const [todayArticles, setTodayArticles] = useState<ArchiveArticle[]>([]);
  // No blocking loading state for Home hero
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
          setTodayArticles(mockArchiveArticles.slice(0, 2));
        } else {
          const now = new Date();
          const prevYear = now.getUTCFullYear() - 1;
          const month = now.getUTCMonth() + 1;
          const day = now.getUTCDate();

          const [popular, stories, dayDocs] = await Promise.all([
            getMostPopular('7'),
            getTopStories('home'),
            searchArticlesByDay(prevYear, month, day),
          ]);
          setTrendingArticles(popular.slice(0, 3));
          setTopStories(stories.slice(0, 3));
          setTodayArticles((dayDocs || []).slice(0, 2));
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
        </div>
      </section>

      {/* A Day Like Today */}
      <section className="featured-content" aria-label="A Day Like Today">
        <div className="content-grid">
          <div className="content-section today-section">
            <div className="section-header">
              <h2>A Day Like Today</h2>
              <Link to="/archive" className="view-all-link">View In Archive →</Link>
            </div>
            <div className="articles-grid">
              {todayArticles.map((a) => {
                const href = getSafeUrl(a.web_url) || undefined;
                const handleOpen = () => { if (href) window.open(href, '_blank', 'noopener,noreferrer'); };
                const handleKey = (e: React.KeyboardEvent) => {
                  if ((e.key === 'Enter' || e.key === ' ') && href) { e.preventDefault(); handleOpen(); }
                };
                return (
                  <article
                    key={a.uri || a._id}
                    className="article-card today-card"
                    role={href ? 'link' : undefined}
                    tabIndex={href ? 0 : -1}
                    aria-label={href ? `Open: ${a.headline?.main || a.abstract || 'Article'}` : undefined}
                    onClick={handleOpen}
                    onKeyDown={handleKey}
                  >
                    <div className="article-content">
                      <div className="article-meta">
                        <span className="section">{a.section_name || a.news_desk || 'Archive'}</span>
                        <span className="date">{formatDate(a.pub_date)}</span>
                      </div>
                      <h3 className="article-title">{a.headline?.main || a.abstract}</h3>
                      <p className="article-abstract">{a.snippet || a.lead_paragraph || ''}</p>
                      {a.byline?.original ? (<div className="article-footer"><span className="byline">{a.byline.original}</span></div>) : null}
                    </div>
                  </article>
                );
              })}
            </div>
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
          
          <Link to="/books" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Books</h3>
            <p>Best Sellers by list</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

// Simple cache helpers
// cache helpers removed (no longer used on Home)
