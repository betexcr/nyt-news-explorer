import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getArchive, NytApiError } from '../api/nyt-apis';
import type { ArchiveArticle } from '../types/nyt.other';
import Spinner from '../components/Spinner';
import { mockArchiveArticles } from '../api/mock-data';
import '../styles/archive.css';
import '../styles/page-header.css';
import { useSearchStore } from '../store/searchStore';
import { normalizeArchive } from '../utils/normalize';

// Utility: clamp
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

// Archive bounds
const START_YEAR = 1851; // NYT archive starts in 1851
const START_MONTH = 10; // October
const CURRENT_YEAR = new Date().getFullYear();
const END_YEAR = CURRENT_YEAR;

function valueToPosition(value: number, min: number, max: number, trackWidth: number): number {
  const span = max - min;
  const pct = (value - min) / (span || 1);
  return pct * trackWidth;
}

const ArchivePage: React.FC = () => {
  // Picker state
  const [year, setYear] = useState<number>(START_YEAR);
  const [month, setMonth] = useState<number>(10);
  const [day, setDay] = useState<number | null>(1); // start with oldest possible day filter
  const [loading, setLoading] = useState<boolean>(false);
  // Keep local error handling but do not surface in UI
  const [, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArchiveArticle[]>([]);
  // Applied query (set when user presses Search)
  const [query, setQuery] = useState<{ year: number; month: number; day: number | null } | null>({
    year: START_YEAR,
    month: 10,
    day: 1,
  });

  // Month slider track
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState<number>(0);
  // Year slider track
  const yearTrackRef = useRef<HTMLDivElement | null>(null);
  const [yearTrackWidth, setYearTrackWidth] = useState<number>(0);

  // Resize observer to keep track widths accurate
  useEffect(() => {
    const monthEl = trackRef.current;
    const yearEl = yearTrackRef.current;
    const update = () => {
      if (monthEl) setTrackWidth(monthEl.getBoundingClientRect().width);
      if (yearEl) setYearTrackWidth(yearEl.getBoundingClientRect().width);
    };
    update();
    const RO: any = (typeof window !== 'undefined' && (window as any).ResizeObserver) || null;
    let roMonth: any = null;
    let roYear: any = null;
    if (RO) {
      try {
        roMonth = monthEl ? new RO(() => setTrackWidth(monthEl.getBoundingClientRect().width)) : null;
        roYear = yearEl ? new RO(() => setYearTrackWidth(yearEl.getBoundingClientRect().width)) : null;
        if (roMonth && typeof roMonth.observe === 'function' && monthEl) roMonth.observe(monthEl);
        if (roYear && typeof roYear.observe === 'function' && yearEl) roYear.observe(yearEl);
        return () => {
          if (roMonth && typeof roMonth.disconnect === 'function') roMonth.disconnect();
          if (roYear && typeof roYear.disconnect === 'function') roYear.disconnect();
        };
      } catch {
        // fall through to window resize listener
      }
    }
    // Fallback for test environments without ResizeObserver
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Drag logic
  const dragging = useRef<'year' | 'month' | 'day' | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (dragging.current === 'month') {
        if (!trackRef.current) return;
        const bounds = trackRef.current.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const posPct = clamp(x / bounds.width, 0, 1);
        let nextMonth = Math.round(1 + posPct * 11);
        nextMonth = clamp(nextMonth, 1, 12);
        // Enforce earliest available archive date: Oct 1851
        if (year === START_YEAR && nextMonth < START_MONTH) nextMonth = START_MONTH;
        setMonth(nextMonth);
      } else if (dragging.current === 'year') {
        if (!yearTrackRef.current) return;
        const bounds = yearTrackRef.current.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const posPct = clamp(x / bounds.width, 0, 1);
        const nextYear = clamp(Math.round(START_YEAR + posPct * (END_YEAR - START_YEAR)), START_YEAR, END_YEAR);
        setYear(nextYear);
        // If we're at the start year, ensure month is not before October
        if (nextYear === START_YEAR && month < START_MONTH) setMonth(START_MONTH);
      } else if (dragging.current === 'day') {
        if (!trackRef.current) return; // day uses native range, but keep for completeness
        const bounds = trackRef.current.getBoundingClientRect();
        const x = e.clientX - bounds.left;
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

  // Note: year options replaced by a continuous year slider

  // Fetch archive data only when user presses Search (query is set)
  useEffect(() => {
    if (!query) return;
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
        const docs = await getArchive(query.year, query.month, controller.signal);
        // Optional client-side day filtering
        const filtered = query.day ? docs.filter(d => new Date(d.pub_date).getDate() === query.day) : docs;
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
  }, [query]);

  const handleTrackMouseDown = (_e: React.MouseEvent) => {
    // Single handle for month selection
    dragging.current = 'month';
  };
  const handleYearTrackMouseDown = (_e: React.MouseEvent) => {
    dragging.current = 'year';
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

  const { setViewMode } = useSearchStore();
  useEffect(() => {
    // Force list view in archive
    setViewMode('list');
  }, [setViewMode]);

  return (
    <div className="archive-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">NYT Archive Explorer</h1>
          <p className="page-subtitle">Browse decades of history from {START_YEAR} to {END_YEAR}</p>
        </div>
        <div className="header-controls">
          <div className="range-label">{openRangeLabel}</div>
        </div>
      </header>

      <section className="era-title-wrap">
        <h2 className={`era-title ${getEraClass(year)}`}>{eraTitle}</h2>
      </section>

      <section className="epoch-slider">
        <div className="controls">
          <div className="control grow">
            <label className="control-label">Year</label>
            <div className="slider-track pretty" ref={yearTrackRef} onMouseDown={handleYearTrackMouseDown}>
              <div
                className="slider-handle from shadow"
                style={{ left: `${(valueToPosition(year, START_YEAR, END_YEAR, yearTrackWidth) / Math.max(yearTrackWidth, 1)) * 100}%` }}
                role="slider"
                aria-valuemin={START_YEAR}
                aria-valuemax={END_YEAR}
                aria-valuenow={year}
                aria-label="Year"
                tabIndex={0}
              />
              <div className="year-ticks" aria-hidden>
                {useMemo(() => {
                  const ticks: number[] = [];
                   const startDecade = Math.floor(START_YEAR / 10) * 10;
                  const endDecade = Math.floor(END_YEAR / 10) * 10;
                  for (let y = startDecade; y <= endDecade; y += 10) ticks.push(y);
                  return ticks;
                }, []).map((y) => (
                  <span
                    key={`year-${y}`}
                    className={y === Math.floor(year / 10) * 10 ? 'current' : ''}
                    style={{ left: `${(valueToPosition(y, START_YEAR, END_YEAR, yearTrackWidth) / Math.max(yearTrackWidth, 1)) * 100}%` }}
                  >
                    {y}
                  </span>
                ))}
              </div>
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

          <div className="control day" style={{ visibility: 'hidden', height: 0, padding: 0, margin: 0 }} />

          <div className="control">
            <button
              className="retry-button"
              onClick={() => setQuery({ year, month, day })}
              aria-label="Search archive"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Error messages hidden per request */}

      {loading ? (
        <div style={{ padding: '2rem' }}><Spinner /></div>
      ) : (
        <section className={'archive-list'}>
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


