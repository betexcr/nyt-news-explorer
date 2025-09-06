import React, { useEffect, useMemo, useState } from 'react';
import '../styles/archive.css';

interface DayLikeTodayWidgetProps {
  className?: string;
}

interface RandomArticle {
  id: string;
  url: string;
  title: string;
  abstract: string;
  snippet: string;
  leadParagraph: string;
  source: string;
  publishedDate: string;
  author: string;
  section: string;
  subsection: string;
}

const DayLikeTodayWidget: React.FC<DayLikeTodayWidgetProps> = ({ className }) => {
  const today = useMemo(() => new Date(), []);
  const [articles, setArticles] = useState<RandomArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  const fetchRandomArticle = async (year: number, month: number, day: number): Promise<RandomArticle | null> => {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/articles/archive/${year}/${month}/${day}/random`);
      if (response.status === 204) return null; // No content
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch article for ${year}-${month}-${day}:`, error);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Build a random set of years >=1851 and <= current year, fixed month/day
        const START_YEAR = 1851;
        const CURRENT_YEAR = year;
        const MAX_YEARS = 12; // keep requests reasonable
        const pool: number[] = [];
        for (let y = START_YEAR; y <= CURRENT_YEAR; y++) pool.push(y);
        // Shuffle and pick first MAX_YEARS
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const pick = pool.slice(0, Math.min(MAX_YEARS, pool.length));

        const results = await Promise.allSettled(
          pick.map((yy) => fetchRandomArticle(yy, month, day))
        );
        
        const validArticles = results
          .filter((r): r is PromiseFulfilledResult<RandomArticle | null> => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value as RandomArticle)
          .filter((article) => article && article.url && /^https?:\/\//i.test(article.url));

        if (cancelled) return;
        setArticles(validArticles);
      } catch {
        if (!cancelled) {
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [year, month, day, today]);

  const heading = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };
    return `A day like today · ${today.toLocaleDateString(undefined, opts)}`;
  }, [today]);

  const getSafeUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      return /^https?:$/i.test(u.protocol) ? u.toString() : null;
    } catch {
      return null;
    }
  };

  return (
    <section className={`day-like-today ${className || ''}`} aria-label="A day like today">
      <h2>{heading}</h2>
      {loading ? (
        <div style={{ padding: '1rem 0' }}>Loading…</div>
      ) : (articles.length > 0 ? (
        <div style={{ height: 'auto', overflowY: 'visible' }}>
          <section className={`archive-grid single-column`} style={{ ['--card-min' as any]: `520px` }}>
            {articles.map((article) => {
              const href = getSafeUrl(article.url) || undefined;
              const date = new Date(article.publishedDate);
              return (
                <article key={article.id} className="archive-card" tabIndex={0} style={{ position: 'relative' }}>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="badge section">{article.section || 'Archive'}</span>
                      <span className="dot" aria-hidden>•</span>
                      <time className="date" dateTime={article.publishedDate}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</time>
                    </div>
                    <h3 className="card-title">{article.title}</h3>
                    {article.author && <div className="byline">{article.author}</div>}
                    <p className="card-abstract">{article.abstract || article.snippet || ''}</p>
                    <div className="card-actions">
                      {href && (
                        <a className="read-link" href={href} target="_blank" rel="noopener noreferrer">Read on NYTimes →</a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      ) : (
        <div style={{ padding: '0.5rem 0', opacity: 0.8 }}>No articles available for today.</div>
      ))}
    </section>
  );
};

export default DayLikeTodayWidget;


