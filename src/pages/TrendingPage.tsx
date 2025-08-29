import React, { useState, useEffect } from 'react';
import { getMostPopular, MOST_POPULAR_PERIODS, type MostPopularArticle } from '../api/nyt-graphql';
import { mockTrendingArticles } from '../api/mock-data';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import ViewToggle from '../components/ViewToggle';
import '../styles/trending.css';
import '../styles/controls.css';
import '../styles/page-header.css';
import { useSearchStore } from '../store/searchStore';
import { normalizeMostPopular } from '../utils/normalize';

const TrendingPage: React.FC = () => {
  const [articles, setArticles] = useState<MostPopularArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1' | '7' | '30'>('7');
  const [refreshTick] = useState<number>(0);
  const [cardMin, setCardMin] = useState<number>(300);
  const USE_MOCK = !process.env.REACT_APP_NYT_API_KEY;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (USE_MOCK) {
          setArticles(mockTrendingArticles);
        } else {
          const data = await getMostPopular(selectedPeriod, controller.signal);
          setArticles(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch trending articles');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedPeriod, USE_MOCK, refreshTick]);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1': return 'Today';
      case '7': return 'This Week';
      case '30': return 'This Month';
      default: return 'This Week';
    }
  };

  const getImageUrl = (article: MostPopularArticle): string => {
    if (article.media && article.media.length > 0) {
      const media = article.media[0];
      const mm = media['media-metadata'] || [];
      // Prefer largest 3x2 image if present, otherwise fallbacks
      const preferred =
        mm.find((m: any) => /^(Large|superJumbo|mediumThreeByTwo440)$/i.test(m.format)) ||
        mm.find((m: any) => /^(mediumThreeByTwo210|Large Thumbnail)$/i.test(m.format)) ||
        mm.find((m: any) => /^(Standard Thumbnail)$/i.test(m.format)) ||
        mm[0];
      if (preferred?.url) return preferred.url;
    }
    return '/logo.png';
  };

  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    return /^(https?:)?\/\//i.test(url) ? url : null;
  };

  const { favorites, addFavorite, removeFavorite, viewMode, setViewMode } = useSearchStore();
  const isFav = (a: MostPopularArticle) => favorites.some(f => f.web_url === a.url);
  const toggleFav = (a: MostPopularArticle) => {
    const normalized = normalizeMostPopular(a);
    if (isFav(a)) removeFavorite(normalized.web_url); else addFavorite(normalized);
  };

  if (loading && articles.length === 0) {
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

      {loading && articles.length > 0 && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}

      <div className="trending-grid" style={{ display: viewMode === 'list' ? 'block' : undefined, ['--card-min' as any]: `${cardMin}px` }}>
        {articles.map((article, index) => (
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
                <span className="date">{formatDate(article.published_date)}</span>
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

      {!loading && articles.length === 0 && !error && (
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
