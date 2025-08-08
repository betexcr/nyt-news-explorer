import React, { useState, useEffect } from 'react';
import { getTopStories, TOP_STORIES_SECTIONS, type TopStory } from '../api/nyt-apis';
import { mockTopStories } from '../api/mock-data';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import ViewToggle from '../components/ViewToggle';
import '../styles/top-stories.css';
import '../styles/controls.css';
import '../styles/page-header.css';
import { useSearchStore } from '../store/searchStore';
import { normalizeTopStory } from '../utils/normalize';

const TopStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<TopStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('home');
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
          setStories(mockTopStories);
        } else {
          const data = await getTopStories(selectedSection, controller.signal);
          setStories(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch top stories');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedSection, USE_MOCK, refreshTick]);

  const getSectionLabel = (section: string) => {
    const labels: Record<string, string> = {
      'home': 'Home',
      'arts': 'Arts',
      'automobiles': 'Automobiles',
      'books': 'Books',
      'business': 'Business',
      'fashion': 'Fashion',
      'food': 'Food',
      'health': 'Health',
      'insider': 'Insider',
      'magazine': 'Magazine',
      'movies': 'Movies',
      'nyregion': 'New York Region',
      'obituaries': 'Obituaries',
      'opinion': 'Opinion',
      'politics': 'Politics',
      'realestate': 'Real Estate',
      'science': 'Science',
      'sports': 'Sports',
      'sundayreview': 'Sunday Review',
      'technology': 'Technology',
      'theater': 'Theater',
      't-magazine': 'T Magazine',
      'travel': 'Travel',
      'upshot': 'The Upshot',
      'us': 'U.S.',
      'world': 'World'
    };
    return labels[section] || section;
  };

  const getImageUrl = (story: TopStory): string => {
    if (story.multimedia && story.multimedia.length > 0) {
      const media = story.multimedia[0];
      // Prefer legacy xlarge when available, otherwise media.url
      const legacy = (media as any).legacy;
      if (legacy?.xlarge) return legacy.xlarge;
      if (media.url) return media.url;
    }
    return '/logo.png';
  };

  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    return /^(https?:)?\/\//i.test(url) ? url : null;
  };

  const { favorites, addFavorite, removeFavorite, viewMode, setViewMode } = useSearchStore();
  const isFav = (story: TopStory) => favorites.some(f => f.web_url === story.url);
  const toggleFav = (story: TopStory) => {
    const normalized = normalizeTopStory(story);
    if (isFav(story)) removeFavorite(normalized.web_url); else addFavorite(normalized);
  };

  if (loading && stories.length === 0) {
    return (
      <div className="top-stories-page">
        <div className="top-stories-header">
          <h1>Top Stories</h1>
          <p>Latest top stories from The New York Times</p>
        </div>
        <div className="loading-container">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="top-stories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Top Stories</h1>
          <p className="page-subtitle">Latest top stories from The New York Times</p>
        </div>
      </div>
      <div className="controls-card" role="region" aria-label="Top Stories controls">
        <div className="controls-row">
          <div className="section-selector">
            <label htmlFor="section-select">Section:</label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="section-select"
            >
              {TOP_STORIES_SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {getSectionLabel(section)}
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

      {loading && stories.length > 0 && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}

      <div className="top-stories-grid" style={{ display: viewMode === 'list' ? 'block' : undefined, ['--card-min' as any]: `${cardMin}px` }}>
        {stories.map((story, _index) => (
          <article key={story.uri} className="top-story-card" style={viewMode === 'list' ? { display: 'flex', gap: '1rem', alignItems: 'stretch' } : undefined}>
            <div className="top-story-card-image">
              <img
                src={getImageUrl(story)}
                alt={story.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/logo.png';
                }}
              />
              <div className="story-badge">
                <span className="badge-text">Top Story</span>
              </div>
              <button
                onClick={() => toggleFav(story)}
                className="favorite-btn"
                aria-label={isFav(story) ? 'Remove from favorites' : 'Add to favorites'}
                title={isFav(story) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFav(story) ? '♥' : '♡'}
              </button>
            </div>
            
            <div className="top-story-card-content" style={viewMode === 'list' ? { padding: '1rem 1rem 1rem 0' } : undefined}>
              <div className="top-story-card-meta">
                <span className="section">{story.section}</span>
                <span className="date">{formatDate(story.published_date)}</span>
              </div>
              
              <h2 className="top-story-card-title">
                {getSafeUrl(story.url) ? (
                  <a
                    href={getSafeUrl(story.url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="title-link"
                    aria-label={`Open full story: ${story.title}`}
                  >
                    {story.title}
                  </a>
                ) : (
                  <span className="title-link" aria-disabled="true">{story.title}</span>
                )}
              </h2>
              
              <p className="top-story-card-abstract">
                {story.abstract}
              </p>
              
              <div className="top-story-card-footer">
                <span className="byline">{story.byline}</span>
                <div className="top-story-card-actions">
                  {getSafeUrl(story.url) ? (
                    <a
                      href={getSafeUrl(story.url) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="read-more-button"
                      aria-label={`Read full story: ${story.title}`}
                    >
                      Read Story →
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

      {!loading && stories.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>No top stories found</h3>
          <p>Try selecting a different section or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default TopStoriesPage;
