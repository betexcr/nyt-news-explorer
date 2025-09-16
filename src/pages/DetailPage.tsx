import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import type { Article } from "../types/nyt";
import { getArticleByUrl } from "../api/nyt";
import { formatDate } from "../utils/format";
import ViewTransitionImage from "../components/ViewTransitionImage";
import ViewTransitionWrapper from "../components/ViewTransitionWrapper";
import "../styles/detail.css";

function getImageUrl(article: Article | null): string {
  const mm = article?.multimedia; 
  if (mm) {
    // Try default first, then thumbnail as fallback
    if (mm.default && mm.default.url) {
      return mm.default.url; // URLs are already complete
    }
    
    if (mm.thumbnail && mm.thumbnail.url) {
      return mm.thumbnail.url; // URLs are already complete
    }
  }
  return "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg";
}

const DetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const url = params.get("url") || "";

  const { state } = useLocation() as { state?: { article?: Article } };
  const initialArticle = useMemo(() => state?.article || null, [state]);

  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [loading, setLoading] = useState<boolean>(false);

  // Generate article ID for view transitions (same as in ArticleCard)
  const articleId = useMemo(() => {
    if (article?._id) return article._id;
    if (article?.web_url) return article.web_url.split('/').pop() || Math.random().toString(36).substr(2, 9);
    return Math.random().toString(36).substr(2, 9);
  }, [article]);

  useEffect(() => {
    if (!article && url) {
      setLoading(true);
      getArticleByUrl(url)
        .then((a) => setArticle(a))
        .finally(() => setLoading(false));
    }
  }, [article, url]);

  useEffect(() => {
    if (!url && !article) {
      navigate(-1);
    }
  }, [url, article, navigate]);

  if (!url && !article) return null;

  return (
    <ViewTransitionWrapper transitionName="detail-page" className="detail-wrap">
      <article className="panel" style={{ padding: "1rem" }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <ViewTransitionImage
              className="detail-hero view-transition-detail-hero"
              src={getImageUrl(article)}
              alt=""
              articleId={articleId}
              viewTransitionName={`article-img-${articleId}`}
              fallbackSrc="/logo.png"
              lightboxEnabled={true}
            />
            <h1 
              className="view-transition-detail-title" 
              style={{ 
                marginBottom: ".25rem",
                viewTransitionName: `article-title-${articleId}`,
              }}
            >
              {article?.headline?.main || ""}
            </h1>
            <div 
              className="detail-meta view-transition-detail-meta"
              style={{ viewTransitionName: `article-byline-${articleId}` }}
            >
              <span>{formatDate(article?.pub_date)}</span>
              {article?.section_name ? (
                <span>{article.section_name}</span>
              ) : null}
              {article?.byline?.original ? (
                <span>{article.byline.original}</span>
              ) : null}
            </div>
            {article?.section_name && (
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
                  marginBottom: "1rem",
                }}
              >
                {article.section_name}
              </div>
            )}
            <div className="detail-body view-transition-detail-body">
              {article?.lead_paragraph ? <p>{article.lead_paragraph}</p> : null}
              {article?.snippet ? <p>{article.snippet}</p> : null}
            </div>

            <div className="actions">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  aria-label="Open full article"
                >
                  Open full article
                </a>
              ) : null}
              <Link to="/search" className="button">
                Back to search
              </Link>
            </div>
          </>
        )}
      </article>
    </ViewTransitionWrapper>
  );
};

export default DetailPage;
