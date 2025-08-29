import React from "react";
import { Link, createSearchParams } from "react-router-dom";
import type { Article } from "../types/nyt";
import type { MostPopularArticle } from "../types/nyt.other";
import { formatDate } from "../utils/format";
import { useSearchStore } from "../store/searchStore";

// Union type for articles that can be either regular articles or most popular articles
type ArticleWithMedia = Article | MostPopularArticle;

function getImageUrl(article: ArticleWithMedia): string {
  // Handle Most Popular articles (which have 'media' property)
  if ('media' in article && article.media && Array.isArray(article.media) && article.media.length > 0) {
    const mediaItem = article.media[0];
    if (mediaItem && 'media-metadata' in mediaItem && mediaItem['media-metadata'] && Array.isArray(mediaItem['media-metadata']) && mediaItem['media-metadata'].length > 0) {
      const metadataArray = mediaItem['media-metadata'];
      
      // Try to construct higher resolution URLs from the available thumbnail
      const thumbnailMetadata = metadataArray.find(m => m.format === 'Standard Thumbnail');
      if (thumbnailMetadata && thumbnailMetadata.url) {
        // Construct higher resolution URLs by replacing the format in the URL
        // The URL pattern is: .../image-name-thumbStandard.jpg
        // We want to replace -thumbStandard.jpg with -articleLarge.jpg
        const baseUrl = thumbnailMetadata.url.replace('-thumbStandard.jpg', '');
        
        // Try superJumbo first (highest resolution), then articleLarge, then fallback to available formats
        const superJumboUrl = `${baseUrl}-superJumbo.jpg`;
        const articleLargeUrl = `${baseUrl}-articleLarge.jpg`;
        
        // For now, we'll use articleLarge as it's a good balance of quality and performance
        // In a production app, you might want to implement image loading with fallbacks
        // Add cache-busting parameter to ensure fresh images are loaded
        return `${articleLargeUrl}?v=highres`;
      }
      
      // Fallback to the original logic if URL construction fails
      const preferredFormat = metadataArray.find(m => m.format === 'mediumThreeByTwo440') ||
                             metadataArray.find(m => m.format === 'mediumThreeByTwo210') ||
                             metadataArray[0]; // fallback to first available
      
      if (preferredFormat && preferredFormat.url) {
        return preferredFormat.url;
      }
    }
  }
  
  // Handle regular articles (which have 'multimedia' property)
  if ('multimedia' in article) {
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
  }
  return "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg";
}

interface Props {
  article: ArticleWithMedia;
}

const ArticleCard: React.FC<Props> = ({ article }) => {
  const image = getImageUrl(article);
  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  
  // Handle both regular articles and Most Popular articles
  const articleUrl = 'web_url' in article ? article.web_url : article.url;
  const articleTitle = 'headline' in article ? article.headline?.main : article.title;
  const articleAbstract = 'snippet' in article ? article.snippet : article.abstract;
  const articleDate = 'pub_date' in article ? article.pub_date : article.published_date;
  const articleSection = 'section_name' in article ? article.section_name : ('section' in article ? article.section : undefined);
  
  // Check if article is favorited by comparing URLs
  const isFavorite = favorites?.some(fav => fav.web_url === articleUrl) || false;
  
  const to = {
    pathname: "/detail",
    search: `?${createSearchParams({ url: articleUrl || '' }).toString()}`,
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
      removeFavorite(articleUrl);
    } else {
      // Convert Most Popular articles to regular articles for favorites
      if ('media' in article) {
        // This is a Most Popular article, convert it to regular article format
        const regularArticle = {
          _id: String(article.id),
          web_url: article.url,
          snippet: article.abstract,
          lead_paragraph: article.abstract,
          multimedia: article.media.length > 0 ? {
            default: (() => {
              const metadataArray = article.media[0]['media-metadata'];
              const thumbnailMetadata = metadataArray?.find(m => m.format === 'Standard Thumbnail');
              if (thumbnailMetadata?.url) {
                const baseUrl = thumbnailMetadata.url.replace('-thumbStandard.jpg', '');
                const articleLargeUrl = `${baseUrl}-articleLarge.jpg?v=highres`;
                return {
                  url: articleLargeUrl,
                  height: 400, // articleLarge is typically 600x400
                  width: 600
                };
              }
              const preferredFormat = metadataArray?.find(m => m.format === 'mediumThreeByTwo440') ||
                                    metadataArray?.find(m => m.format === 'mediumThreeByTwo210') ||
                                    metadataArray?.[0];
              return preferredFormat ? {
                url: preferredFormat.url,
                height: preferredFormat.height,
                width: preferredFormat.width
              } : undefined;
            })(),
            thumbnail: (() => {
              const metadataArray = article.media[0]['media-metadata'];
              const thumbnailMetadata = metadataArray?.find(m => m.format === 'Standard Thumbnail');
              if (thumbnailMetadata?.url) {
                const baseUrl = thumbnailMetadata.url.replace('-thumbStandard.jpg', '');
                const articleLargeUrl = `${baseUrl}-articleLarge.jpg?v=highres`;
                return {
                  url: articleLargeUrl,
                  height: 400, // articleLarge is typically 600x400
                  width: 600
                };
              }
              const preferredFormat = metadataArray?.find(m => m.format === 'mediumThreeByTwo440') ||
                                    metadataArray?.find(m => m.format === 'mediumThreeByTwo210') ||
                                    metadataArray?.[0];
              return preferredFormat ? {
                url: preferredFormat.url,
                height: preferredFormat.height,
                width: preferredFormat.width
              } : undefined;
            })()
          } : {},
          headline: { main: article.title },
          pub_date: article.published_date,
          section_name: article.section,
          keywords: [],
          byline: { original: article.byline }
        };
        addFavorite(regularArticle);
      } else {
        // This is already a regular article
        addFavorite(article);
      }
    }
  };

  return (
    <Link
      to={to}
      state={{ article }}
      onClick={onClick}
      style={{ display: "block", textDecoration: "none", color: "inherit", position: "relative" }}
      aria-label={articleTitle || "Article"}
    >
      <article className="panel" style={{ padding: ".9rem" }}>
        <img src={image} alt="" className="thumb" />
        <h3 className="title">{articleTitle || ""}</h3>
        <div className="meta">
          <span>{formatDate(articleDate)}</span>
          {articleSection ? <span> · {articleSection}</span> : null}
        </div>
        <p className="lead">{articleAbstract || ""}</p>
        
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
