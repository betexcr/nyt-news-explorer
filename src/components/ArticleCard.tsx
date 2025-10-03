import React, { useState } from "react";
import { createSearchParams } from "react-router-dom";
import type { Article } from "../types/nyt";
import { formatDate } from "../utils/format";
import { useSearchStore } from "../store/searchStore";
import ViewTransitionLink from "./ViewTransitionLink";
import ViewTransitionImage from "./ViewTransitionImage";

function getImageUrl(article: Article): string {
  const mm = article.multimedia;
  
  if (mm && Array.isArray(mm) && mm.length > 0) {
    // NYT API returns an array of multimedia objects
    // Try to find the best image format
    const superJumbo = mm.find(m => m.format === 'Super Jumbo');
    const threeByTwo = mm.find(m => m.format === 'threeByTwoSmallAt2X');
    const thumbLarge = mm.find(m => m.format === 'Large Thumbnail');
    
    // Return the best available image
    if (superJumbo?.url) return superJumbo.url;
    if (threeByTwo?.url) return threeByTwo.url;
    if (thumbLarge?.url) return thumbLarge.url;
    
    // Fallback to first available image
    if (mm[0]?.url) return mm[0].url;
  }
  
  // Legacy support for old format (if it exists)
  if (mm && typeof mm === 'object' && !Array.isArray(mm)) {
    if (mm.default && mm.default.url) {
      return mm.default.url;
    }
    if (mm.thumbnail && mm.thumbnail.url) {
      return mm.thumbnail.url;
    }
  }
  
  // For articles without multimedia, show a more appropriate fallback
  // Use a generic news image that's more visually appealing than the T logo
  return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop&crop=center";
}

interface Props {
  article: Article;
}

const ArticleCard: React.FC<Props> = ({ article }) => {
  const image = getImageUrl(article);
  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  const isFavorite = favorites?.some(fav => fav.web_url === article.web_url) || false;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Generate article ID for view transitions
  const articleId = article._id || article.web_url?.split('/').pop() || Math.random().toString(36).substr(2, 9);
  
  const to = {
    pathname: "/detail",
    search: `?${createSearchParams({ url: article.web_url || '' }).toString()}`,
  };

  // Store page-specific scroll position (Search page handles its own restoration)
  const onClick = () => {
    try {
      const y = window.scrollY || 0;
      sessionStorage.setItem('search-page-scroll', String(y));
      useSearchStore.getState().setScrollY(y);
    } catch {}
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFavorite) {
      removeFavorite(article.web_url);
    } else {
      addFavorite(article);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <ViewTransitionLink
      to={to}
      state={{ article }}
      onClick={onClick}
      style={{ display: "block", textDecoration: "none", color: "inherit", position: "relative" }}
      aria-label={article.headline?.main || "Article"}
      articleId={articleId}
      elementType="container"
    >
      <article 
        className="article-card view-transition-article-card" 
        style={{ 
          viewTransitionName: `article-${articleId}`,
        }}
      >
        {/* Image Container with Loading State */}
        <div className="article-card__image-container">
          {imageLoading && (
            <div className="article-card__image-loading">
              <div className="article-card__skeleton"></div>
            </div>
          )}
          <ViewTransitionImage
            src={image}
            alt={article.headline?.main || "Article image"}
            className={`article-card__image view-transition-article-image ${imageLoading ? 'loading' : ''} ${imageError ? 'error' : ''}`}
            articleId={articleId}
            fallbackSrc="/logo.png"
            priority="low"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className={`article-card__favorite ${isFavorite ? 'favorited' : ''}`}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Section Badge */}
          {article.section_name && (
            <div 
              className="article-card__section-badge"
              style={{ viewTransitionName: `article-section-${articleId}` }}
            >
              {article.section_name}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="article-card__content">
          <h3 
            className="article-card__title view-transition-article-title"
            style={{ viewTransitionName: `article-title-${articleId}` }}
          >
            {article.headline?.main || ""}
          </h3>
          
          <div 
            className="article-card__meta view-transition-article-meta"
            style={{ viewTransitionName: `article-byline-${articleId}` }}
          >
            <time dateTime={article.pub_date}>
              {formatDate(article.pub_date)}
            </time>
            {article.byline?.original && (
              <span className="article-card__byline">
                by {article.byline.original}
              </span>
            )}
          </div>
          
          {article.snippet && (
            <p className="article-card__snippet view-transition-article-content">
              {article.snippet}
            </p>
          )}
        </div>
      </article>
    </ViewTransitionLink>
  );
};

export default ArticleCard;
