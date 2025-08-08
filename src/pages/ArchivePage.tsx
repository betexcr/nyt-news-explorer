import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getArchive, NytApiError } from '../api/nyt-apis';
import type { ArchiveArticle } from '../types/nyt.other';
import Spinner from '../components/Spinner';
import ViewToggle from '../components/ViewToggle';
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

  const monthNamesShort = useMemo(() => (
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  ), []);

  const monthNamesLong = useMemo(() => (
    ['January','February','March','April','May','June','July','August','September','October','November','December']
  ), []);

  const openRangeLabel = `${year}-${String(month).padStart(2, '0')}${day ? '-' + String(day).padStart(2, '0') : ''}`;

  const eraTitle = useMemo(() => {
    const base = `${monthNamesLong[clamp(month,1,12)-1]} ${year}`;
    if (day) return `${monthNamesLong[clamp(month,1,12)-1]} ${String(day).padStart(2, '0')}, ${year}`;
    return base;
  }, [month, year, day, monthNamesLong]);

  const getEraClass = (y: number): string => {
    if (y < 1900) return 'victorian';
    if (y < 2000) {
      const decade = Math.floor(y / 10) * 10; // 1900, 1910, ..., 1990
      return `decade-${decade}s`;
    }
    return 'modern';
  };

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

  const getSafeUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      return /^https?:$/i.test(u.protocol) ? u.toString() : null;
    } catch {
      return null;
    }
  };

  const { favorites, addFavorite, removeFavorite } = useSearchStore();
  const isFav = (a: ArchiveArticle) => favorites.some(f => f.web_url === a.web_url);
  const toggleFav = (a: ArchiveArticle) => {
    const normalized = normalizeArchive(a);
    if (isFav(a)) removeFavorite(normalized.web_url); else addFavorite(normalized);
  };

  const { viewMode, setViewMode } = useSearchStore();

  return (
    <div className="archive-page">
      <header className="archive-header">
        <div>
          <h1 className="archive-title">NYT Archive Explorer</h1>
          <p className="archive-subtitle">Browse decades of history from {START_YEAR} to {END_YEAR}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="range-label">{openRangeLabel}</div>
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
        </div>
      </header>

      <section className="era-title-wrap">
        <h2 className={`era-title ${getEraClass(year)}`}>{eraTitle}</h2>
      </section>

      <section className="epoch-slider">
        <div className="controls">
          <div className="control">
            <label className="control-label" htmlFor="year-select">Year:</label>
            <div className="select-wrap">
              <select id="year-select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="select-caret" aria-hidden>▾</span>
            </div>
          </div>

          <div className="control grow">
            <label className="control-label">Month</label>
            <div className="slider-track pretty" ref={trackRef} onMouseDown={handleTrackMouseDown}>
              <div
                className="slider-handle from shadow"
                style={{ left: `${(valueToPosition(month, 1, 12, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}
                role="slider"
                aria-valuemin={1}
                aria-valuemax={12}
                aria-valuenow={month}
                aria-label="Month"
                tabIndex={0}
              />
              <div className="month-ticks" aria-hidden>
                {monthNamesShort.map((lbl, i) => (
                  <span
                    key={`month-${i+1}`}
                    className={i + 1 === month ? 'current' : ''}
                    style={{ left: `${(valueToPosition(i+1, 1, 12, trackWidth) / Math.max(trackWidth, 1)) * 100}%` }}
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="control day">
            <div className="switch">
              <input id="day-toggle" type="checkbox" checked={day !== null} onChange={(e) => {
                if (!e.target.checked) setDay(null); else setDay(1);
              }} />
              <label htmlFor="day-toggle">Day filter</label>
            </div>
            {day !== null && (
              <div className="day-slider">
                <input
                  type="range"
                  min={1}
                  max={new Date(year, month, 0).getDate()}
                  value={day}
                  onChange={(e) => setDay(clamp(parseInt(e.target.value, 10) || 1, 1, new Date(year, month, 0).getDate()))}
                  aria-label="Day"
                />
                <div className="day-readout">{String(day).padStart(2,'0')}</div>
              </div>
            )}
          </div>

          <div className="control">
            <button className="retry-button" onClick={() => setRefreshTick((p) => p + 1)}>Refresh</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-message"><p>⚠️ {error}</p></div>
      )}

      {loading ? (
        <div style={{ padding: '2rem' }}><Spinner /></div>
      ) : (
        <section className={viewMode === 'list' ? 'archive-list' : 'archive-grid'}>
          {articles.length === 0 ? (
            <div className="empty-state">No results for selected range.</div>
          ) : (
            articles.map((a) => {
              const href = getSafeUrl(a.web_url) || undefined;
              const date = new Date(a.pub_date);
              const keywords = (a.keywords || []).slice(0, 3).map(k => k.value).filter(Boolean);
              return (
                <article key={a.uri} className="archive-card" tabIndex={0}>
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
                      <span className="badge section">{a.section_name || a.news_desk || 'Archive'}</span>
                      <span className="dot" aria-hidden>•</span>
                      <time className="date" dateTime={a.pub_date}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</time>
                      {a.word_count ? (<><span className="dot" aria-hidden>•</span><span className="badge wc">{a.word_count} words</span></>) : null}
                    </div>
                    <h3 className="card-title">{a.headline?.main || a.abstract}</h3>
                    {a.byline?.original && <div className="byline">{a.byline.original}</div>}
                    <p className="card-abstract">{a.snippet || a.lead_paragraph || ''}</p>
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
            })
          )}
        </section>
      )}
    </div>
  );
};

export default ArchivePage;


