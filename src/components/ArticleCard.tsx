import React from "react";
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
        className="panel view-transition-article-card" 
        style={{ 
          padding: ".9rem",
          viewTransitionName: `article-${articleId}`,
        }}
      >
        <ViewTransitionImage
          src={image}
          alt=""
          className="thumb view-transition-article-image"
          articleId={articleId}
          fallbackSrc="/logo.png"
        />
        <h3 
          className="title view-transition-article-title"
          style={{ viewTransitionName: `article-title-${articleId}` }}
        >
          {article.headline?.main || ""}
        </h3>
        <div 
          className="meta view-transition-article-meta"
          style={{ viewTransitionName: `article-byline-${articleId}` }}
        >
          <span>{formatDate(article.pub_date)}</span>
          {article.section_name ? <span> · {article.section_name}</span> : null}
        </div>
        {article.section_name && (
          <div 
            className="section-chip"
            style={{ 
              viewTransitionName: `article-section-${articleId}`,
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
              fontWeight: "500",
              marginTop: "0.5rem",
            }}
          >
            {article.section_name}
          </div>
        )}
        <p className="lead view-transition-article-content">{article.snippet || ""}</p>
        
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: isFavorite ? "rgba(255, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.6)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            transition: "all var(--vt-duration-fast) var(--vt-ease)",
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </article>
    </ViewTransitionLink>
  );
};

export default ArticleCard;
