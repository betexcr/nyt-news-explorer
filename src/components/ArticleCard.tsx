import React from "react";
import { Link, createSearchParams } from "react-router-dom";
import type { Article } from "../types/nyt";
import { formatDate } from "../utils/format";
import { useSearchStore } from "../store/searchStore";

function getImageUrl(article: Article): string {
  // Handle Most Popular articles (which have 'media' property)
  if ('media' in article && article.media && article.media.length > 0) {
    const mediaItem = article.media[0];
    if (mediaItem['media-metadata'] && mediaItem['media-metadata'].length > 0) {
      const metadata = mediaItem['media-metadata'][0];
      if (metadata.url) {
        return metadata.url;
      }
    }
  }
  
  // Handle regular articles (which have 'multimedia' property)
  const mm = article.multimedia;
  if (mm) {
    // Try default first, then thumbnail as fallback
    if (mm.default && mm.default.url) {
      const url = mm.default.url; // URLs are already complete
      return url;
    }
    
    if (mm.thumbnail && mm.thumbnail.url) {
      const url = mm.thumbnail.url; // URLs are already complete
      return url;
    }
  }
  return "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg";
}

interface Props {
  article: Article;
}

const ArticleCard: React.FC<Props> = ({ article }) => {
  const image = getImageUrl(article);
  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  const isFavorite = favorites?.some(fav => fav.web_url === article.web_url) || false;
  
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
    <Link
      to={to}
      state={{ article }}
      onClick={onClick}
      style={{ display: "block", textDecoration: "none", color: "inherit", position: "relative" }}
      aria-label={article.headline?.main || "Article"}
    >
      <article className="panel" style={{ padding: ".9rem" }}>
        <img src={image} alt="" className="thumb" />
        <h3 className="title">{article.headline?.main || ""}</h3>
        <div className="meta">
          <span>{formatDate(article.pub_date)}</span>
          {article.section_name ? <span> · {article.section_name}</span> : null}
        </div>
        <p className="lead">{article.snippet || ""}</p>
        
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
            transition: "all 0.2s ease",
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </article>
    </Link>
  );
};

export default ArticleCard;
