import React, { useEffect, useMemo, useState } from 'react';
import { getArchive, NytApiError } from '../api/nyt-apis';
import type { ArchiveArticle } from '../types/nyt.other';
import Spinner from '../components/Spinner';
import { mockArchiveArticles } from '../api/mock-data';
import '../styles/archive.css';
import '../styles/page-header.css';
import '../styles/controls.css';
import { useSearchStore } from '../store/searchStore';
import { normalizeArchive } from '../utils/normalize';

// Utility: clamp
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

// Archive bounds
const START_YEAR = 1851; // NYT archive starts in 1851
const START_MONTH = 10; // October
const CURRENT_YEAR = new Date().getFullYear();
const END_YEAR = CURRENT_YEAR;
const CURRENT_MONTH = new Date().getMonth() + 1;

//

const ArchivePage: React.FC = () => {
  // Picker state
  const [year, setYear] = useState<number>(START_YEAR);
  const [month, setMonth] = useState<number>(10);
  // Calendar/day selection (always visible)
  const [dayStart, setDayStart] = useState<number | null>(1); // default to 1 for initial oldest search
  const [dayEnd, setDayEnd] = useState<number | null>(15);
  const [loading, setLoading] = useState<boolean>(false);
  // Keep local error handling but do not surface in UI
  const [, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArchiveArticle[]>([]);
  const [cardMin, setCardMin] = useState<number>(300);
  // Applied query (set when user presses Search)
  const [query, setQuery] = useState<
    { year: number; month: number; dayStart: number | null; dayEnd: number | null } | null
  >({
    year: START_YEAR,
    month: 10,
    dayStart: 1,
    dayEnd: 15,
  });

  // Sliders removed. Calendar header controls drive navigation.

  // Invariant: if we're at the first archive year, month cannot be before October
  useEffect(() => {
    if (year === START_YEAR && month < START_MONTH) {
      setMonth(START_MONTH);
    }
  }, [year, month]);

  useEffect(() => {
    if (year === START_YEAR && month < START_MONTH) setMonth(START_MONTH);
    if (year === END_YEAR && month > CURRENT_MONTH) setMonth(CURRENT_MONTH);
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
        // Optional client-side day filtering or range filtering
        const filtered = (() => {
          const s = query.dayStart;
          const e = query.dayEnd;
          if (s != null && e != null) {
            return docs.filter(d => {
              const dn = new Date(d.pub_date).getDate();
              return dn >= s && dn <= e;
            });
          }
          if (s != null) {
            return docs.filter(d => new Date(d.pub_date).getDate() === s);
          }
          return docs;
        })();
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

  // Month/year navigation via calendar header
  const canPrev = useMemo(() => !(year === START_YEAR && month === START_MONTH), [year, month]);
  const canNext = useMemo(() => !(year === END_YEAR && month === CURRENT_MONTH), [year, month]);
  const prevMonth = () => {
    if (!canPrev) return;
    let y = year;
    let m = month - 1;
    if (m < 1) { y -= 1; m = 12; }
    if (y === START_YEAR && m < START_MONTH) { y = START_YEAR; m = START_MONTH; }
    setYear(y); setMonth(m);
  };
  const nextMonth = () => {
    if (!canNext) return;
    let y = year;
    let m = month + 1;
    if (m > 12) { y += 1; m = 1; }
    if (y === END_YEAR && m > CURRENT_MONTH) { y = END_YEAR; m = CURRENT_MONTH; }
    setYear(y); setMonth(m);
  };

//

  const monthNamesLong = useMemo(() => (
    ['January','February','March','April','May','June','July','August','September','October','November','December']
  ), []);


  const eraTitle = useMemo(() => {
    const base = `${monthNamesLong[clamp(month,1,12)-1]} ${year}`;
    if (dayStart != null && dayEnd != null) {
      if (dayStart === dayEnd) {
        return `${monthNamesLong[clamp(month,1,12)-1]} ${String(dayStart).padStart(2, '0')}, ${year}`;
      }
      return `${base} (days ${String(dayStart).padStart(2, '0')}–${String(dayEnd).padStart(2, '0')})`;
    }
    if (dayStart != null) return `${monthNamesLong[clamp(month,1,12)-1]} ${String(dayStart).padStart(2, '0')}, ${year}`;
    return base;
  }, [month, year, dayStart, dayEnd, monthNamesLong]);

  const getEraClass = (y: number): string => {
    const decade = Math.floor(y / 10) * 10; // e.g. 1850, 1860, ... 2020
    const decadeClass = `decade-${decade}s`;
    if (y < 1900) return `victorian ${decadeClass}`;
    if (y >= 2000) return `modern ${decadeClass}`;
    return decadeClass;
  };

  // No preview image for archive cards per requirements

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

  // Archive uses a dedicated cards grid; no global view mode

  const daysInSelectedMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const onCalendarDayClick = (d: number) => {
    if (dayStart == null || (dayStart != null && dayEnd != null)) {
      setDayStart(d);
      setDayEnd(null);
      return;
    }
    const start = Math.min(dayStart, d);
    const end = Math.max(dayStart, d);
    setDayStart(start);
    setDayEnd(end);
  };

  // Generate a random (year, month) pair within archive bounds
  const getRandomYearMonth = (): { year: number; month: number } => {
    const minYear = START_YEAR;
    const maxYear = END_YEAR;
    // Pick a random year in range
    const ry = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    // Determine valid month bounds for that year
    const minMonth = ry === START_YEAR ? START_MONTH : 1;
    const maxMonth = ry === END_YEAR ? CURRENT_MONTH : 12;
    const rm = Math.floor(Math.random() * (maxMonth - minMonth + 1)) + minMonth;
    return { year: ry, month: rm };
  };

  const handleRandomSearch = () => {
    const { year: ry, month: rm } = getRandomYearMonth();
    setYear(ry);
    setMonth(rm);
    // Optionally clamp day range to target month length
    const daysInTargetMonth = new Date(ry, rm, 0).getDate();
    const s = dayStart != null ? Math.min(dayStart, daysInTargetMonth) : dayStart;
    const e = dayEnd != null ? Math.min(dayEnd, daysInTargetMonth) : dayEnd;
    setQuery({ year: ry, month: rm, dayStart: s, dayEnd: e });
  };

  return (
    <div className="archive-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">Browse NYT history from {START_YEAR} to {END_YEAR}</p>
        </div>
      </header>

      {/* Help description just below main title */}
      <p className="archive-help">
        Use the arrows to change months, adjust the year with the slider, and click one or two days to pick
        a single day or a day range. Press Search to load articles from the selected period.
      </p>

      <section className="era-title-wrap">
        <h2 className={`era-title ${getEraClass(year)}`}>{eraTitle}</h2>
      </section>

      {/* Calendar replaces sliders */}
      <section aria-label="Calendar" className="calendar compact">
              <div className="calendar-header">
                <button type="button" className="cal-nav" onClick={prevMonth} disabled={!canPrev} aria-label="Previous month">‹</button>
                <div className="cal-title" aria-live="polite">{monthNamesLong[clamp(month,1,12)-1]} {year}</div>
                <button type="button" className="cal-nav" onClick={nextMonth} disabled={!canNext} aria-label="Next month">›</button>
              </div>

              <div className="calendar-layout">
                <div className="calendar-main">
                  <div className="calendar-year">
                    <label className="year-label" htmlFor="archive-year">Year</label>
                    <input
                      id="archive-year"
                      type="range"
                      min={START_YEAR}
                      max={END_YEAR}
                      step={1}
                      value={year}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10);
                        setYear(y);
                        if (y === START_YEAR && month < START_MONTH) setMonth(START_MONTH);
                        if (y === END_YEAR && month > CURRENT_MONTH) setMonth(CURRENT_MONTH);
                      }}
                      aria-label="Year"
                    />
                    <div className="year-readout" aria-hidden>{year}</div>
                  </div>

                  <div className="calendar-grid" role="grid">
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => {
                      const isSelected = (dayStart != null && dayEnd == null && d === dayStart) || (dayStart != null && dayEnd != null && (d === dayStart || d === dayEnd));
                      const inRange = dayStart != null && dayEnd != null && d > dayStart && d < dayEnd;
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`calendar-day${isSelected ? ' selected' : ''}${inRange ? ' in-range' : ''}`}
                          aria-pressed={isSelected || inRange}
                          onClick={() => onCalendarDayClick(d)}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Removed inline aside; replaced with floating control outside container */}
              </div>

              <div className="calendar-footer">
                <label className="size-control mobile-only">
                  Card size
                  <input
                    type="range"
                    min={220}
                    max={520}
                    step={10}
                    value={cardMin}
                    onChange={(e) => setCardMin(parseInt(e.target.value, 10))}
                    aria-label="Card size"
                  />
                </label>
                <button
                  className="retry-button"
                  onClick={handleRandomSearch}
                  aria-label="Search archive"
                >
                  Search
                </button>
              </div>
            </section>

            {/* Desktop toolbar row for size control (separate row, not overlay) */}
            <div className="archive-toolbar desktop-only" role="toolbar" aria-label="Archive controls">
              <label className="size-control" title="Adjust card size">
                Card size
                <input
                  type="range"
                  min={220}
                  max={520}
                  step={10}
                  value={cardMin}
                  onChange={(e) => setCardMin(parseInt(e.target.value, 10))}
                  aria-label="Card size"
                />
              </label>
            </div>

      {/* Removed floating search button; button moved inside calendar */}

      {/* Error messages hidden per request */}

      {loading ? (
        <div style={{ padding: '2rem' }}><Spinner /></div>
      ) : (
        <>
        {/* Size control moved into calendar footer */}
          <section
            className={`archive-grid${cardMin >= 520 ? ' single-column' : ''}`}
            style={{ ['--card-min' as any]: `${cardMin}px` }}
          >
          {articles.length === 0 ? (
            <div className="empty-state">No results for selected range.</div>
          ) : (
              articles.map((a) => {
              const href = getSafeUrl(a.web_url) || undefined;
              const date = new Date(a.pub_date);
              const keywords = (a.keywords || []).slice(0, 3).map(k => k.value).filter(Boolean);
              return (
                  <article key={a.uri} className="archive-card" tabIndex={0} style={{ position: 'relative' }}>
                    {/* Favorite heart overlay – match Search style */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(a); }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: isFav(a) ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'all 0.2s ease',
                      }}
                      title={isFav(a) ? 'Remove from favorites' : 'Add to favorites'}
                      aria-label={isFav(a) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFav(a) ? '♥' : '♡'}
                    </button>
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
        </>
      )}
    </div>
  );
};

export default ArchivePage;


