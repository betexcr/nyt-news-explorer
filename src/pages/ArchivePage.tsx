import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getArchive } from '../api/nyt-apis';
import type { ArchiveArticle } from '../types/nyt.other';
import Spinner from '../components/Spinner';
import '../styles/archive.css';

// Utility: clamp
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

// Decade slider config
const START_YEAR = 1851; // NYT archive starts in 1851
const CURRENT_YEAR = new Date().getFullYear();
const END_YEAR = CURRENT_YEAR;
const STEP = 10; // decade

function yearsToPosition(year: number, trackWidth: number): number {
  const span = END_YEAR - START_YEAR;
  const pct = (year - START_YEAR) / span;
  return pct * trackWidth;
}

function positionToYear(x: number, trackWidth: number): number {
  const span = END_YEAR - START_YEAR;
  const pct = clamp(x / trackWidth, 0, 1);
  const year = Math.round(START_YEAR + pct * span);
  return Math.floor(year / STEP) * STEP; // snap to decade
}

const ArchivePage: React.FC = () => {
  const [fromYear, setFromYear] = useState<number>(1900);
  const [toYear, setToYear] = useState<number>(1990);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArchiveArticle[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState<number>(0);

  // Resize observer to keep track width accurate
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.getBoundingClientRect().width);
    update();
    const RO: any = (typeof window !== 'undefined' && (window as any).ResizeObserver) || null;
    if (RO) {
      try {
        const ro = new RO(update);
        if (ro && typeof ro.observe === 'function') {
          ro.observe(el);
          return () => {
            if (typeof ro.disconnect === 'function') ro.disconnect();
          };
        }
      } catch {
        // fall through to window resize listener
      }
    }
    // Fallback for test environments without ResizeObserver
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Drag logic
  const dragging = useRef<'from' | 'to' | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !trackRef.current) return;
      const bounds = trackRef.current.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const snappedYear = positionToYear(x, bounds.width);
      if (dragging.current === 'from') {
        setFromYear((prev) => clamp(Math.min(snappedYear, toYear - STEP), START_YEAR, END_YEAR - STEP));
      } else {
        setToYear((prev) => clamp(Math.max(snappedYear, fromYear + STEP), START_YEAR + STEP, END_YEAR));
      }
    };
    const onUp = () => (dragging.current = null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [fromYear, toYear]);

  const decadeLabels = useMemo(() => {
    const labels: number[] = [];
    for (let y = START_YEAR; y <= END_YEAR; y += STEP) labels.push(y);
    return labels;
  }, []);

  // Fetch archive data for the selected decade range.
  // We fetch one month per boundary (Jan of fromYear and Dec of toYear) and a few midpoints to preview variety
  useEffect(() => {
    const controller = new AbortController();
    const USE_KEY = !!process.env.REACT_APP_NYT_API_KEY;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!USE_KEY) {
          setArticles([]);
          return;
        }
        const months: Array<{ y: number; m: number }> = [];
        months.push({ y: fromYear, m: 1 });
        const mid = Math.floor((fromYear + toYear) / 2);
        months.push({ y: mid, m: 6 });
        months.push({ y: toYear, m: 12 });
        const all: ArchiveArticle[] = [];
        for (const { y, m } of months) {
          const docs = await getArchive(y, m, controller.signal);
          all.push(...docs);
        }
        // Light de-dupe by uri
        const seen = new Set<string>();
        const unique = all.filter((a) => {
          if (seen.has(a.uri)) return false;
          seen.add(a.uri);
          return true;
        });
        setArticles(unique.slice(0, 60));
      } catch (err: any) {
        if (err.code !== 'ABORTED') setError(err.message || 'Failed to fetch archive');
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [fromYear, toYear, refreshTick]);

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const bounds = trackRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const yFrom = yearsToPosition(fromYear, bounds.width);
    const yTo = yearsToPosition(toYear, bounds.width);
    const nearFrom = Math.abs(x - yFrom) < Math.abs(x - yTo);
    dragging.current = nearFrom ? 'from' : 'to';
  };

  const openRangeLabel = `${fromYear}s – ${toYear}s`;

  const getImage = (a: ArchiveArticle): string => {
    const mm: any[] = (a as any).multimedia || [];
    const first = mm[0];
    if (first?.url) return first.url;
    return '/logo.png';
  };

  return (
    <div className="archive-page">
      <header className="archive-header">
        <div>
          <h1 className="archive-title">NYT Archive Explorer</h1>
          <p className="archive-subtitle">Browse decades of history from {START_YEAR} to {END_YEAR}</p>
        </div>
        <div className="range-label">{openRangeLabel}</div>
      </header>

      <section className="epoch-slider">
        <div className="slider-track" ref={trackRef} onMouseDown={handleTrackMouseDown}>
          <div
            className="slider-selection"
            style={{
              left: `${(yearsToPosition(fromYear, trackWidth) / Math.max(trackWidth, 1)) * 100}%`,
              right: `${100 - (yearsToPosition(toYear, trackWidth) / Math.max(trackWidth, 1)) * 100}%`,
            }}
          />
          <div
            className="slider-handle from"
            style={{ left: `${(yearsToPosition(fromYear, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}
            role="slider"
            aria-valuemin={START_YEAR}
            aria-valuemax={END_YEAR}
            aria-valuenow={fromYear}
            aria-label="From decade"
          />
          <div
            className="slider-handle to"
            style={{ left: `${(yearsToPosition(toYear, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}
            role="slider"
            aria-valuemin={START_YEAR}
            aria-valuemax={END_YEAR}
            aria-valuenow={toYear}
            aria-label="To decade"
          />
          <div className="decade-labels">
            {decadeLabels.map((y) => (
              <span key={y} style={{ left: `${(yearsToPosition(y, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}>
                {y}
              </span>
            ))}
          </div>
        </div>
        <div className="slider-actions">
          <button className="retry-button" onClick={() => setRefreshTick((p) => p + 1)}>Refresh</button>
        </div>
      </section>

      {error && (
        <div className="error-message"><p>⚠️ {error}</p></div>
      )}

      {loading ? (
        <div style={{ padding: '2rem' }}><Spinner /></div>
      ) : (
        <section className="archive-grid">
          {articles.length === 0 ? (
            <div className="empty-state">No results for selected range.</div>
          ) : (
            articles.map((a) => (
              <article key={a.uri} className="archive-card">
                <div className="card-image">
                  <img src={getImage(a)} alt={a.headline?.main || a.abstract || 'NYT archive'} />
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    <span className="section">{a.section_name}</span>
                    <span className="date">{new Date(a.pub_date).getFullYear()}</span>
                  </div>
                  <h3 className="card-title">{a.headline?.main || a.abstract}</h3>
                  <p className="card-abstract">{a.snippet || a.lead_paragraph || ''}</p>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
};

export default ArchivePage;


