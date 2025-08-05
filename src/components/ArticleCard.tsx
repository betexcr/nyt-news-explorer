import React from "react";
import { Link, createSearchParams } from "react-router-dom";
import type { Article } from "../types/nyt";
import { formatDate } from "../utils/format";
import { useSearchStore } from "../store/searchStore";

function getImageUrl(article: Article): string {
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
  const to = {
    pathname: "/detail",
    search: `?${createSearchParams({ url: article.web_url || '' }).toString()}`,
  };

  const onClick = () => {
    try {
      useSearchStore.getState().setScrollY(window.scrollY || 0);
    } catch {}
  };

  return (
    <Link
      to={to}
      state={{ article }}
      onClick={onClick}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
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
      </article>
    </Link>
  );
};

export default ArticleCard;
