import React, { useState, useEffect, useRef } from "react";
import { useSearchStore } from "../store/searchStore";
import type { MostPopularArticle, TopStory } from "../types/nyt.other";
import { mockTrendingArticles, mockTopStories } from "../api/mock-data";
import { getMostPopular, getTopStories } from "../api/nyt-apis";
import { formatDate } from "../utils/format";
import ViewTransitionLink from "../components/ViewTransitionLink";
import ViewTransitionImage from "../components/ViewTransitionImage";
import ViewTransitionWrapper from "../components/ViewTransitionWrapper";
import { preloadHomeImages, preloadArticleImages } from "../utils/simpleImageCache";
// Spinner not used on Home; hero renders immediately
import "../styles/home.css";

const HomePage: React.FC = () => {
  const reset = useSearchStore((state) => state.reset);
  const [trendingArticles, setTrendingArticles] = useState<MostPopularArticle[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);
  
  // No blocking loading state for Home hero
  // Keep local error handling but do not surface in UI
  const [, setError] = useState<string | null>(null);
  // Prevent duplicate fetches in React 18 StrictMode dev double-invoke
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    const USE_MOCK = !process.env.REACT_APP_NYT_API_KEY;

    // Preload critical home images
    preloadHomeImages();

    const fetchHomeData = async () => {
      // Clear any previous error
      setError(null);
      try {
        if (USE_MOCK) {
          setTrendingArticles(mockTrendingArticles.slice(0, 3));
          setTopStories(mockTopStories.slice(0, 3));
        } else {
          const [popular, stories] = await Promise.all([
            getMostPopular('7'),
            getTopStories('home'),
          ]);
          setTrendingArticles(popular.slice(0, 3));
          setTopStories(stories.slice(0, 3));

          // Preload article images for better performance
          const allImages = [
            ...popular.slice(0, 3).map(article => getImageUrl(article)),
            ...stories.slice(0, 3).map(story => getImageUrl(story))
          ].filter(url => url && url !== '/logo.png');
          
          if (allImages.length > 0) {
            preloadArticleImages(allImages);
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
    <ViewTransitionWrapper transitionName="home-page" className="home-page">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="hero-content">
          <h1 className="hero-title">NYT News Explorer</h1>
          <p className="hero-subtitle">Discover the latest news from The New York Times</p>
          
          <div className="hero-actions">
            <ViewTransitionLink to="/search" className="hero-button primary" onClick={handleHomeClick}>
              Search Articles
            </ViewTransitionLink>
            <ViewTransitionLink to="/archive" className="hero-button secondary">
              Explore Archive
            </ViewTransitionLink>
          </div>
        </div>
        
        <div className="hero-image">
          <ViewTransitionImage
            src="/home-hero.jpg"
            srcSet="/home-hero-800.jpg 800w, /home-hero-1200.jpg 1200w, /home-hero-1600.jpg 1600w, /home-hero-2400.jpg 2400w"
            sizes="100vw"
            alt="New York Times News Explorer"
            className="home-hero view-transition-hero"
            viewTransitionName="hero-image"
            priority="high"
          />
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
              <ViewTransitionLink to="/trending" className="view-all-link">View All →</ViewTransitionLink>
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
                    <ViewTransitionImage
                      src={getImageUrl(article)}
                      alt={article.title}
                      className="view-transition-article-image"
                      viewTransitionName={`trending-image-${index}`}
                      fallbackSrc="/logo.png"
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
              <ViewTransitionLink to="/top-stories" className="view-all-link">View All →</ViewTransitionLink>
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
                    <ViewTransitionImage
                      src={getImageUrl(story)}
                      alt={story.title}
                      className="view-transition-article-image"
                      viewTransitionName={`top-story-image-${_index}`}
                      fallbackSrc="/logo.png"
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

      

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Explore More</h2>
        <div className="actions-grid">
          <ViewTransitionLink to="/search" className="action-card" onClick={handleHomeClick}>
            <div className="action-icon" aria-hidden="true" />
            <h3>Search Articles</h3>
            <p>Find specific articles with advanced filters</p>
          </ViewTransitionLink>
          
          <ViewTransitionLink to="/trending" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Trending</h3>
            <p>Most popular articles this week</p>
          </ViewTransitionLink>
          
          <ViewTransitionLink to="/top-stories" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Top Stories</h3>
            <p>Latest top stories by section</p>
          </ViewTransitionLink>
          
          <ViewTransitionLink to="/archive" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Archive</h3>
            <p>Browse history back to Oct 1, 1851</p>
          </ViewTransitionLink>
          
          <ViewTransitionLink to="/favorites" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Favorites</h3>
            <p>Your saved articles</p>
          </ViewTransitionLink>
          
          <ViewTransitionLink to="/books" className="action-card">
            <div className="action-icon" aria-hidden="true" />
            <h3>Books</h3>
            <p>Best Sellers by list</p>
          </ViewTransitionLink>
        </div>
      </section>
    </ViewTransitionWrapper>
  );
};

export default HomePage;

// Simple cache helpers
// cache helpers removed (no longer used on Home)
