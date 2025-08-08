import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import { getMostPopular, getTopStories, type MostPopularArticle, type TopStory } from "../api/nyt-apis";
import { formatDate } from "../utils/format";
import Spinner from "../components/Spinner";
import "../styles/home.css";

const HomePage: React.FC = () => {
  const reset = useSearchStore((state) => state.reset);
  const [trendingArticles, setTrendingArticles] = useState<MostPopularArticle[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch trending articles (most popular from last 7 days)
        const trendingData = await getMostPopular('7');
        setTrendingArticles(trendingData.slice(0, 3)); // Show top 3 trending
        
        // Fetch top stories from home section
        const topStoriesData = await getTopStories('home');
        setTopStories(topStoriesData.slice(0, 3)); // Show top 3 stories
      } catch (err: any) {
        setError(err.message || 'Failed to fetch home data');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleHomeClick = () => {
    reset();
  };

  const getImageUrl = (article: MostPopularArticle | TopStory): string => {
    if ('media' in article && article.media && article.media.length > 0) {
      const media = article.media[0];
      if (media['media-metadata'] && media['media-metadata'].length > 0) {
        const metadata = media['media-metadata'];
        const largeImage = metadata.find(m => m.format === 'Large Thumbnail') ||
                          metadata.find(m => m.format === 'Standard Thumbnail') ||
                          metadata[0];
        return largeImage?.url || '';
      }
    }
    
    if ('multimedia' in article && article.multimedia && article.multimedia.length > 0) {
      const media = article.multimedia.find(m => m.subtype === 'photo') ||
                   article.multimedia[0];
      return media?.url || '';
    }
    
    return '';
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="home-hero-section">
          <div className="hero-content">
            <h1 className="hero-title">NYT News Explorer</h1>
            <p className="hero-subtitle">Discover the latest news from The New York Times</p>
          </div>
          <div className="loading-container">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="hero-content">
          <h1 className="hero-title">NYT News Explorer</h1>
          <p className="hero-subtitle">Discover the latest news from The New York Times</p>
          
          <div className="hero-actions">
            <Link to="/search" className="hero-button primary" onClick={handleHomeClick}>
              🔍 Search Articles
            </Link>
            <Link to="/trending" className="hero-button secondary">
              📈 Trending Now
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

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Featured Content Section */}
      <section className="featured-content">
        <div className="content-grid">
          {/* Trending Articles */}
          <div className="content-section trending-section">
            <div className="section-header">
              <h2>🔥 Trending This Week</h2>
              <Link to="/trending" className="view-all-link">View All →</Link>
            </div>
            
            <div className="articles-grid">
              {trendingArticles.map((article, index) => (
                <article key={article.id} className="article-card trending-card">
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
                    
                    <h3 className="article-title">
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {article.title}
                      </a>
                    </h3>
                    
                    <p className="article-abstract">{article.abstract}</p>
                    
                    <div className="article-footer">
                      <span className="byline">{article.byline}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Top Stories */}
          <div className="content-section top-stories-section">
            <div className="section-header">
              <h2>📰 Top Stories</h2>
              <Link to="/top-stories" className="view-all-link">View All →</Link>
            </div>
            
            <div className="articles-grid">
              {topStories.map((story, index) => (
                <article key={story.uri} className="article-card story-card">
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
                    
                    <h3 className="article-title">
                      <a href={story.url} target="_blank" rel="noopener noreferrer">
                        {story.title}
                      </a>
                    </h3>
                    
                    <p className="article-abstract">{story.abstract}</p>
                    
                    <div className="article-footer">
                      <span className="byline">{story.byline}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Explore More</h2>
        <div className="actions-grid">
          <Link to="/search" className="action-card" onClick={handleHomeClick}>
            <div className="action-icon">🔍</div>
            <h3>Search Articles</h3>
            <p>Find specific articles with advanced filters</p>
          </Link>
          
          <Link to="/trending" className="action-card">
            <div className="action-icon">📈</div>
            <h3>Trending</h3>
            <p>Most popular articles this week</p>
          </Link>
          
          <Link to="/top-stories" className="action-card">
            <div className="action-icon">📰</div>
            <h3>Top Stories</h3>
            <p>Latest top stories by section</p>
          </Link>
          
          <Link to="/api-docs" className="action-card">
            <div className="action-icon">📖</div>
            <h3>API Docs</h3>
            <p>Interactive API documentation</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
