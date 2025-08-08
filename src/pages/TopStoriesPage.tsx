import React, { useState, useEffect, useCallback } from 'react';
import { getTopStories, TOP_STORIES_SECTIONS, type TopStory } from '../api/nyt-apis';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import '../styles/top-stories.css';

const TopStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<TopStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('home');

  const fetchTopStories = useCallback(async (section: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getTopStories(section);
      setStories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch top stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopStories(selectedSection);
  }, [selectedSection, fetchTopStories]);

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
      // Try to get the largest image available
      const media = story.multimedia.find(m => m.subtype === 'photo') ||
                   story.multimedia[0];
      return media?.url || '';
    }
    return '';
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
      <div className="top-stories-header">
        <div className="top-stories-title-section">
          <h1>Top Stories</h1>
          <p>Latest top stories from The New York Times</p>
        </div>
        
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
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button 
            onClick={() => fetchTopStories(selectedSection)}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      )}

      {loading && stories.length > 0 && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}

      <div className="top-stories-grid">
        {stories.map((story, index) => (
          <article key={story.uri} className="top-story-card">
            <div className="top-story-card-image">
              <img
                src={getImageUrl(story)}
                alt={story.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="story-badge">
                <span className="badge-text">Top Story</span>
              </div>
            </div>
            
            <div className="top-story-card-content">
              <div className="top-story-card-meta">
                <span className="section">{story.section}</span>
                <span className="date">{formatDate(story.published_date)}</span>
              </div>
              
              <h2 className="top-story-card-title">
                <a 
                  href={story.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="title-link"
                >
                  {story.title}
                </a>
              </h2>
              
              <p className="top-story-card-abstract">
                {story.abstract}
              </p>
              
              <div className="top-story-card-footer">
                <span className="byline">{story.byline}</span>
                <div className="top-story-card-actions">
                  <a 
                    href={story.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more-button"
                  >
                    Read Story →
                  </a>
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
