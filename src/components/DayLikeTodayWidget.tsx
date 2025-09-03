import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchArchiveByDay } from '../api/graphql-client';
import type { ArchiveArticle } from '../types/nyt.other';
import type { NytArticle } from '../types/nyt';
import { normalizeArchive } from '../utils/normalize';
import '../styles/archive.css';

interface DayLikeTodayWidgetProps {
  className?: string;
}

const PAGE_SIZE = 5;

const DayLikeTodayWidget: React.FC<DayLikeTodayWidgetProps> = ({ className }) => {
  const today = useMemo(() => new Date(), []);
  const [all, setAll] = useState<NytArticle[]>([]);
  const [visible, setVisible] = useState<NytArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

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
          pick.map((yy) => fetchArchiveByDay(yy, month, day, 50))
        );
        let combined: ArchiveArticle[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            combined = combined.concat(r.value);
          }
        }
        let normalized = combined.map(normalizeArchive);
        // Keep only valid external links, deduplicate by web_url, and sort by date desc
        const seen = new Set<string>();
        normalized = normalized.filter((n) => {
          if (!/^https?:\/\//i.test(n.web_url || '')) return false;
          const key = n.web_url;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).sort((a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime());
        if (cancelled) return;
        setAll(normalized);
        const first = normalized.slice(0, PAGE_SIZE);
        setVisible(first);
        setHasMore(normalized.length > first.length);
      } catch {
        if (!cancelled) {
          setAll([]);
          setVisible([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [year, month, day, today]);

  const onLoadMore = useCallback(() => {
    if (loadingMore || loading) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisible((prev) => {
        const next = all.slice(0, prev.length + PAGE_SIZE);
        setHasMore(next.length < all.length);
        return next;
      });
      setLoadingMore(false);
    }, 0);
  }, [all, loadingMore, loading]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 120;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

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
      ) : (visible.length > 0 ? (
        <div style={{ height: 360, overflowY: 'auto' }} onScroll={onScroll}>
          <section className={`archive-grid single-column`} style={{ ['--card-min' as any]: `520px` }}>
            {visible.map((a: NytArticle) => {
              const href = getSafeUrl(a.web_url) || undefined;
              const date = new Date(a.pub_date);
              const keywords = (a.keywords || []).slice(0, 3).map((k: any) => k.value).filter(Boolean);
              return (
                <article key={a.uri} className="archive-card" tabIndex={0} style={{ position: 'relative' }}>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="badge section">{a.section_name || 'Archive'}</span>
                      <span className="dot" aria-hidden>•</span>
                      <time className="date" dateTime={a.pub_date}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</time>
                      {a['word_count' as keyof NytArticle] ? (<><span className="dot" aria-hidden>•</span><span className="badge wc">{(a as any).word_count} words</span></>) : null}
                    </div>
                    <h3 className="card-title">{(a as any).headline?.main || (a as any).abstract}</h3>
                    {(a as any).byline?.original && <div className="byline">{(a as any).byline.original}</div>}
                    <p className="card-abstract">{(a as any).snippet || (a as any).lead_paragraph || ''}</p>
                    {keywords.length > 0 && (
                      <div className="chips">
                        {keywords.map((kw) => (
                          <span key={kw} className="chip">{kw}</span>
                        ))}
                      </div>
                    )}
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
          {loadingMore && <div style={{ padding: '0.5rem 0' }}>Loading more…</div>}
          {!hasMore && visible.length > 0 && <div style={{ padding: '0.5rem 0', opacity: 0.7 }}>No more articles</div>}
        </div>
      ) : (
        <div style={{ padding: '0.5rem 0', opacity: 0.8 }}>No articles available for today.</div>
      ))}
    </section>
  );
};

export default DayLikeTodayWidget;


