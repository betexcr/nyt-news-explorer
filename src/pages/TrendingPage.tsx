import React, { useState, useEffect, useCallback } from 'react';
import { getMostPopular, MOST_POPULAR_PERIODS, type MostPopularArticle } from '../api/nyt-apis';
import { mockTrendingArticles } from '../api/mock-data';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import '../styles/trending.css';

const TrendingPage: React.FC = () => {
  const [articles, setArticles] = useState<MostPopularArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1' | '7' | '30'>('7');

  const fetchTrendingArticles = useCallback(async (period: '1' | '7' | '30') => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mock data instead of API call
      setArticles(mockTrendingArticles);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trending articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingArticles(selectedPeriod);
  }, [selectedPeriod, fetchTrendingArticles]);

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
      if (media['media-metadata'] && media['media-metadata'].length > 0) {
        // Try to get the largest image available
        const metadata = media['media-metadata'];
        const largeImage = metadata.find(m => m.format === 'Large Thumbnail') ||
                          metadata.find(m => m.format === 'Standard Thumbnail') ||
                          metadata[0];
        return largeImage?.url || '';
      }
    }
    return '';
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
      <div className="trending-header">
        <div className="trending-title-section">
          <h1>Trending Articles</h1>
          <p>Most popular articles from The New York Times</p>
        </div>
        
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
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button 
            onClick={() => fetchTrendingArticles(selectedPeriod)}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      )}

      {loading && articles.length > 0 && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}

      <div className="trending-grid">
        {articles.map((article, index) => (
          <article key={article.id} className="trending-card">
            <div className="trending-card-rank">
              <span className="rank-number">#{index + 1}</span>
            </div>
            
            <div className="trending-card-image">
              <img
                src={getImageUrl(article)}
                alt={article.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            
            <div className="trending-card-content">
              <div className="trending-card-meta">
                <span className="section">{article.section}</span>
                <span className="date">{formatDate(article.published_date)}</span>
              </div>
              
              <h2 className="trending-card-title">
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="title-link"
                >
                  {article.title}
                </a>
              </h2>
              
              <p className="trending-card-abstract">
                {article.abstract}
              </p>
              
              <div className="trending-card-footer">
                <span className="byline">{article.byline}</span>
                <div className="trending-card-actions">
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more-button"
                  >
                    Read Article →
                  </a>
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
