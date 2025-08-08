import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getArchive, NytApiError } from '../api/nyt-apis';
import type { ArchiveArticle } from '../types/nyt.other';
import Spinner from '../components/Spinner';
import { mockArchiveArticles } from '../api/mock-data';
import '../styles/archive.css';
import { useSearchStore } from '../store/searchStore';
import { normalizeArchive } from '../utils/normalize';

// Utility: clamp
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

// Archive bounds
const START_YEAR = 1851; // NYT archive starts in 1851
const CURRENT_YEAR = new Date().getFullYear();
const END_YEAR = CURRENT_YEAR;

function valueToPosition(value: number, min: number, max: number, trackWidth: number): number {
  const span = max - min;
  const pct = (value - min) / (span || 1);
  return pct * trackWidth;
}

const ArchivePage: React.FC = () => {
  // Picker state
  const [year, setYear] = useState<number>(1900);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number | null>(null); // optional day filter, client-side only
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
  const dragging = useRef<'month' | 'day' | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !trackRef.current) return;
      const bounds = trackRef.current.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      if (dragging.current === 'month') {
        const posPct = clamp(x / bounds.width, 0, 1);
        const m = Math.round(1 + posPct * 11);
        setMonth(clamp(m, 1, 12));
      } else if (dragging.current === 'day') {
        const daysInMonth = new Date(year, month, 0).getDate();
        const posPct = clamp(x / bounds.width, 0, 1);
        const d = Math.round(1 + posPct * (daysInMonth - 1));
        setDay(clamp(d, 1, daysInMonth));
      }
    };
    const onUp = () => (dragging.current = null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [year, month]);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = START_YEAR; y <= END_YEAR; y++) list.push(y);
    return list;
  }, []);

  // Fetch archive data for the selected year+month only to reduce quota usage
  useEffect(() => {
    const controller = new AbortController();
    const USE_KEY = !!process.env.REACT_APP_NYT_API_KEY;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!USE_KEY) {
          setArticles(mockArchiveArticles);
          return;
        }
        const docs = await getArchive(year, month, controller.signal);
        // Optional client-side day filtering
        const filtered = day ? docs.filter(d => new Date(d.pub_date).getDate() === day) : docs;
        setArticles(filtered.slice(0, 60));
      } catch (err: any) {
        if (err.code === 'ABORTED') return;
        if ((err as NytApiError).status === 403) {
          setError('Archive API denied (403). Showing sample data.');
          setArticles(mockArchiveArticles);
        } else {
          setError(err.message || 'Failed to fetch archive');
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [year, month, day, refreshTick]);

  const handleTrackMouseDown = (_e: React.MouseEvent) => {
    // Single handle for month selection
    dragging.current = 'month';
  };

  const openRangeLabel = `${year}-${String(month).padStart(2, '0')}${day ? '-' + String(day).padStart(2, '0') : ''}`;

  const getImage = (a: ArchiveArticle): string => {
    const mm: any[] = (a as any).multimedia || [];
    const first = mm[0];
    if (first?.url) {
      const u: string = first.url;
      if (/^https?:\/\//i.test(u)) return u;
      const cleaned = u.replace(/^\/+/, '');
      return `https://static01.nyt.com/${cleaned}`;
    }
    return '/logo.png';
  };

  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  const isFav = (a: ArchiveArticle) => favorites.some(f => f.web_url === a.web_url);
  const toggleFav = (a: ArchiveArticle) => {
    const normalized = normalizeArchive(a);
    if (isFav(a)) removeFavorite(normalized.web_url); else addFavorite(normalized);
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label htmlFor="year-select">Year:</label>
          <select id="year-select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <label style={{ marginLeft: '1rem' }}>Month:</label>
          <div className="slider-track" ref={trackRef} onMouseDown={handleTrackMouseDown}>
            <div
              className="slider-selection"
              style={{
                left: `${(valueToPosition(month, 1, 12, trackWidth) / Math.max(trackWidth, 1)) * 100}%`,
                width: 0,
              }}
            />
            <div
              className="slider-handle from"
              style={{ left: `${(valueToPosition(month, 1, 12, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}
              role="slider"
              aria-valuemin={1}
              aria-valuemax={12}
              aria-valuenow={month}
              aria-label="Month"
            />
            <div className="decade-labels">
              {[1,3,5,7,9,11].map((m) => (
                <span key={m} style={{ left: `${(valueToPosition(m, 1, 12, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
          <label style={{ marginLeft: '1rem' }}>Day (optional):</label>
          <input
            type="number"
            min={1}
            max={new Date(year, month, 0).getDate()}
            value={day ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) { setDay(null); return; }
              const d = parseInt(v, 10) || 1;
              const max = new Date(year, month, 0).getDate();
              setDay(clamp(d, 1, max));
            }}
            placeholder="—"
            style={{ width: 64 }}
          />
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
                  <img
                    src={getImage(a)}
                    alt={a.headline?.main || a.abstract || 'NYT archive'}
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.src = '/logo.png';
                    }}
                  />
                  <button
                    onClick={() => toggleFav(a)}
                    className="favorite-btn"
                    aria-label={isFav(a) ? 'Remove from favorites' : 'Add to favorites'}
                    title={isFav(a) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFav(a) ? '♥' : '♡'}
                  </button>
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


