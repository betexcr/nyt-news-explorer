import React from "react";
import { createSearchParams } from "react-router-dom";
import type { UnifiedArticle } from "../services/unifiedSearchService";
import { formatDate } from "../utils/format";
import { useSearchStore } from "../store/searchStore";
import ViewTransitionLink from "./ViewTransitionLink";
import ViewTransitionImage from "./ViewTransitionImage";

function getImageUrl(article: UnifiedArticle): string {
  return article.imageUrl || "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg";
}

interface Props {
  article: UnifiedArticle;
}

const ArticleCard: React.FC<Props> = ({ article }) => {
  const image = getImageUrl(article);
  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  const isFavorite = favorites?.some(fav => fav.web_url === article.url) || false;
  
  // Generate article ID for view transitions
  const articleId = article.id || article.url?.split('/').pop() || Math.random().toString(36).substr(2, 9);
  
  const to = {
    pathname: "/detail",
    search: `?${createSearchParams({ url: article.url || '' }).toString()}`,
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
      removeFavorite(article.url);
    } else {
      // Convert UnifiedArticle to NytArticle format for favorites
      const nytArticle = {
        _id: article.id,
        headline: { main: article.title },
        snippet: article.abstract,
        web_url: article.url,
        pub_date: article.publishedDate,
        byline: { original: article.byline },
        section_name: article.section,
        keywords: [], // Add missing keywords property
        multimedia: article.imageUrl ? { url: article.imageUrl } : { url: '' }
      };
      addFavorite(nytArticle);
    }
  };

  return (
    <ViewTransitionLink
      to={to}
      state={{ article }}
      onClick={onClick}
      style={{ display: "block", textDecoration: "none", color: "inherit", position: "relative" }}
      aria-label={article.title || "Article"}
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
          alt={article.title || ''}
          className="thumb view-transition-article-image"
          articleId={articleId}
          fallbackSrc="/logo.png"
        />
        <h3 
          className="title view-transition-article-title"
          style={{ viewTransitionName: `article-title-${articleId}` }}
        >
          {article.title || ""}
        </h3>
        <div 
          className="meta view-transition-article-meta"
          style={{ viewTransitionName: `article-byline-${articleId}` }}
        >
          <span>{formatDate(article.publishedDate)}</span>
          {article.section ? <span> · {article.section}</span> : null}
        </div>
        {article.section && (
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
            {article.section}
          </div>
        )}
        <p className="lead view-transition-article-content">{article.abstract || ""}</p>
        
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
