import React, { useCallback, useEffect, useState } from 'react';
import type { MovieReview } from '../api/nyt-apis';
import { mockMovieReviews } from '../api/mock-data';
import '../styles/movies.css';

const MovieReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'all' | 'picks'>('all');

  const fetchReviews = useCallback(async (t: 'all' | 'picks') => {
    setLoading(true);
    setError(null);
    try {
      // Use mock data for stability; switch to real API by uncommenting
      // const data = await getMovieReviews(t);
      // setReviews(data);
      setReviews(mockMovieReviews);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch movie reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(type);
  }, [type, fetchReviews]);

  const getImageSrc = (r: MovieReview): string => {
    return r.multimedia?.src || '/logo.png';
  };

  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    return /^(https?:)?\/\//i.test(url) ? url : null;
  };

  return (
    <div className="movies-page">
      <div className="movies-header">
        <div className="movies-title-section">
          <h1>Movie Reviews</h1>
          <p>Latest New York Times movie reviews{type === 'picks' ? ' (Critics’ Picks)' : ''}</p>
        </div>

        <div className="type-selector">
          <label htmlFor="type-select">Filter:</label>
          <select
            id="type-select"
            value={type}
            onChange={(e) => setType(e.target.value as 'all' | 'picks')}
            className="type-select"
          >
            <option value="all">All Reviews</option>
            <option value="picks">Critics’ Picks</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button className="retry-button" onClick={() => fetchReviews(type)}>Try Again</button>
        </div>
      )}

      {loading && reviews.length === 0 && (
        <div className="loading-container">Loading…</div>
      )}

      <div className="movies-grid">
        {reviews.map((r) => (
          <article key={r.display_title} className="movie-card">
            <div className="movie-card-image">
              <img
                src={getImageSrc(r)}
                alt={r.display_title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              {r.critics_pick === 1 && (
                <div className="movie-badge">
                  <span className="badge-text">Critics’ Pick</span>
                </div>
              )}
            </div>
            <div className="movie-card-content">
              <div className="movie-card-meta">
                <span className="mpaa">{r.mpaa_rating || 'NR'}</span>
                <span className="date">{r.publication_date}</span>
              </div>
              <h2 className="movie-card-title">{r.display_title}</h2>
              <p className="movie-card-headline">{r.headline}</p>
              <p className="movie-card-summary">{r.summary_short}</p>
              <div className="movie-card-footer">
                <span className="byline">{r.byline}</span>
                {getSafeUrl(r.link?.url) ? (
                  <a
                    href={getSafeUrl(r.link?.url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="read-more-button"
                    aria-label={`Read full review: ${r.display_title}`}
                  >
                    Read Review →
                  </a>
                ) : (
                  <button className="read-more-button" disabled aria-disabled>
                    Unavailable
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!loading && reviews.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>No reviews found</h3>
          <p>Try a different filter or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default MovieReviewsPage;


