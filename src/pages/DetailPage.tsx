import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import type { NytArticle } from "../types/nyt";
import { getArticleByUrl } from "../api/nyt";
import { formatDate } from "../utils/format";
import "../styles/detail.css";

function getImageUrl(article: NytArticle | null): string {
  const mm = article?.multimedia; 
  if (mm && mm.default && mm.default.url) {
    return mm.default.url;
  }
  return "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg";
}

const DetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const url = params.get("url") || "";

  const { state } = useLocation() as { state?: { article?: NytArticle } };
  const initialArticle = useMemo(() => state?.article || null, [state]);

  const [article, setArticle] = useState<NytArticle | null>(initialArticle);
  const [loading, setLoading] = useState<boolean>(false);

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
    <div className="detail-wrap">
      <article className="panel" style={{ padding: "1rem" }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <img className="detail-hero" src={getImageUrl(article)} alt="" />
            <h1 style={{ marginBottom: ".25rem" }}>
              {article?.headline?.main || ""}
            </h1>
            <div className="detail-meta">
              <span>{formatDate(article?.pub_date)}</span>
              {article?.section_name ? (
                <span>{article.section_name}</span>
              ) : null}
              {article?.byline?.original ? (
                <span>{article.byline.original}</span>
              ) : null}
            </div>
            <div className="detail-body">
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
    </div>
  );
};

export default DetailPage;
