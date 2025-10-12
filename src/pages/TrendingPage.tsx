import React, { useState } from 'react';
import { useMostPopular } from '../hooks/useUnifiedSearch';
import { mockTrendingArticles } from '../api/mock-data';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import ViewToggle from '../components/ViewToggle';
import '../styles/trending.css';
import '../styles/controls.css';
import '../styles/page-header.css';
import { useSearchStore } from '../store/searchStore';
import type { UnifiedArticle } from '../services/unifiedSearchService';

const MOST_POPULAR_PERIODS = ['1', '7', '30'] as const;

const TrendingPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'1' | '7' | '30'>('7');
  const [cardMin, setCardMin] = useState<number>(300);
  const USE_MOCK = !process.env.REACT_APP_NYT_API_KEY;
  
  // Use unified search hook
  const {
    articles,
    loading,
    error,
    search,
  } = useMostPopular(selectedPeriod, { autoSearch: true });

  // Handle period changes
  React.useEffect(() => {
    if (!USE_MOCK) {
      search({
        type: 'most-popular',
        period: selectedPeriod,
      });
    }
  }, [selectedPeriod, USE_MOCK]);

  // Mock data fallback
  const mockArticles: UnifiedArticle[] = USE_MOCK ? mockTrendingArticles.map((article, index) => ({
    id: article.id?.toString() || `mock-trending-${index}`,
    url: article.url || '',
    title: article.title || 'No Title',
    abstract: article.abstract || '',
    byline: article.byline || 'Unknown',
    publishedDate: article.published_date || new Date().toISOString(),
    section: article.section || 'General',
    imageUrl: '/logo.png',
    source: 'most-popular' as const,
    rank: index + 1,
  })) : [];

  const displayArticles = USE_MOCK ? mockArticles : articles;

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1': return 'Today';
      case '7': return 'This Week';
      case '30': return 'This Month';
      default: return 'This Week';
    }
  };

  const getImageUrl = (article: UnifiedArticle): string => {
    return article.imageUrl || '/logo.png';
  };

  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    return /^(https?:)?\/\//i.test(url) ? url : null;
  };

  const { favorites, addFavorite, removeFavorite, viewMode, setViewMode } = useSearchStore();
  const isFav = (a: UnifiedArticle) => favorites.some(f => f.web_url === a.url);
  const toggleFav = (a: UnifiedArticle) => {
    const normalized = {
      web_url: a.url,
      headline: { main: a.title },
      abstract: a.abstract,
      snippet: a.abstract, // Add missing snippet property
      byline: { original: a.byline },
      multimedia: { url: '' },
      pub_date: a.publishedDate,
      section_name: a.section,
      subsection_name: '',
      keywords: [], // Add missing keywords property
    };
    if (isFav(a)) removeFavorite(normalized.web_url); else addFavorite(normalized);
  };

  if (loading && displayArticles.length === 0) {
    return (
      <div className="trending-page">
        <div className="trending-header">
          <h1>Trending Articles</h1>
          <p>Most popular articles from The New York Times</p>
        </div>
        <div className="loading-container">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="trending-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trending Articles</h1>
          <p className="page-subtitle">Most popular articles from The New York Times</p>
        </div>
      </div>
      <div className="controls-card" role="region" aria-label="Trending controls">
        <div className="controls-row">
          <div className="period-selector">
            <label htmlFor="period-select">Time Period:</label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as '1' | '7' | '30')}
              className="period-select"
            >
              {MOST_POPULAR_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {getPeriodLabel(period)}
                </option>
              ))}
            </select>
          </div>
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          {viewMode === 'grid' && (
            <label className="size-control">
              Card size
              <input
                type="range"
                min={220}
                max={520}
                step={10}
                value={cardMin}
                onChange={(e) => setCardMin(parseInt(e.target.value, 10))}
                aria-label="Card size"
              />
            </label>
          )}
        </div>
      </div>

      {/* Error messages hidden per request */}

      {loading && displayArticles.length > 0 && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}

      <div className="trending-grid" style={{ display: viewMode === 'list' ? 'block' : undefined, ['--card-min' as any]: `${cardMin}px` }}>
        {displayArticles.map((article, index) => (
          <article key={article.id} className="trending-card" style={viewMode === 'list' ? { display: 'flex', gap: '1rem', alignItems: 'stretch' } : undefined}>
            <div className="trending-card-rank">
              <span className="rank-number">#{index + 1}</span>
            </div>
            
            <div className="trending-card-image" style={viewMode === 'list' ? { width: 240, height: 160, flex: '0 0 auto' } : undefined}>
              <img
                src={getImageUrl(article)}
                alt={article.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <button
                onClick={() => toggleFav(article)}
                className="favorite-btn"
                aria-label={isFav(article) ? 'Remove from favorites' : 'Add to favorites'}
                title={isFav(article) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFav(article) ? '♥' : '♡'}
              </button>
            </div>
            
            <div className="trending-card-content" style={viewMode === 'list' ? { padding: '1rem 1rem 1rem 0' } : undefined}>
              <div className="trending-card-meta">
                <span className="section">{article.section}</span>
                <span className="date">{formatDate(article.publishedDate)}</span>
              </div>
              
              <h2 className="trending-card-title">
                {getSafeUrl(article.url) ? (
                  <a
                    href={getSafeUrl(article.url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="title-link"
                    aria-label={`Open article: ${article.title}`}
                  >
                    {article.title}
                  </a>
                ) : (
                  <span className="title-link" aria-disabled="true">{article.title}</span>
                )}
              </h2>
              
              <p className="trending-card-abstract">
                {article.abstract}
              </p>
              
              <div className="trending-card-footer">
                <span className="byline">{article.byline}</span>
                <div className="trending-card-actions">
                  {getSafeUrl(article.url) ? (
                    <a
                      href={getSafeUrl(article.url) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="read-more-button"
                      aria-label={`Read full article: ${article.title}`}
                    >
                      Read Article →
                    </a>
                  ) : (
                    <button className="read-more-button" disabled aria-disabled>
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!loading && displayArticles.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>No trending articles found</h3>
          <p>Try selecting a different time period or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default TrendingPage;
