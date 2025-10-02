import React, { useEffect, useMemo, useState } from 'react';
import { getBestSellers, getBooksListByDate, BOOKS_LISTS } from '../api/nyt-apis';
import type { Book } from '../types/nyt.other';
import { mockBooks } from '../api/mock-data';
import '../styles/books.css';

const DEFAULT_LIST = 'hardcover-fiction';

const BooksPage: React.FC = () => {
  const [listName, setListName] = useState<string>(DEFAULT_LIST);
  const [books, setBooks] = useState<Book[]>([]);
  const [date, setDate] = useState<string>('current'); // YYYY-MM-DD or 'current'
  const [loading, setLoading] = useState<boolean>(false);
  const [, setError] = useState<string | null>(null);

  const listOptions = useMemo(() => BOOKS_LISTS, []);

  useEffect(() => {
    let cancelled = false;
    // In production, we use the local API which has the NYT API key server-side
    // In development, we need REACT_APP_NYT_API_KEY
    const USE_API = process.env.NODE_ENV === 'production' || !!process.env.REACT_APP_NYT_API_KEY;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!USE_API) {
          if (!cancelled) setBooks(mockBooks);
          return;
        }
        const results = date === 'current'
          ? await getBestSellers(listName)
          : await getBooksListByDate(listName, date);
        if (!cancelled) setBooks(results);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load books');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [listName, date]);

  return (
    <div className="books-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Books</h1>
          <p className="page-subtitle">NYT Best Sellers lists</p>
        </div>
      </header>

      <div className="books-controls" role="toolbar" aria-label="Books controls">
        <label className="list-select">
          List
          <select
            aria-label="Select best sellers list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          >
            {listOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="list-select">
          Date
          <input
            type="date"
            aria-label="Pick date for list (optional)"
            value={date === 'current' ? '' : date}
            max={new Date().toISOString().slice(0,10)}
            onChange={(e) => setDate(e.target.value ? e.target.value : 'current')}
          />
        </label>
        <button
          type="button"
          className="retry-button"
          onClick={() => { /* triggers useEffect via state already */ }}
          aria-label="Reload list"
        >
          Reload
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
      ) : (
        <section className="books-grid">
          {books.length === 0 ? (
            <div className="empty-state">No books found.</div>
          ) : (
            books.slice(0, 24).map((b) => (
              <article key={b.book_uri} className="book-card">
                <div className="book-media">
                  {b.book_image ? (
                    <img src={b.book_image} alt={b.title} />
                  ) : (
                    <div className="book-placeholder" aria-hidden />
                  )}
                  <div className="rank-badge">#{b.rank}</div>
                </div>
                <div className="book-body">
                  <h3 className="book-title">{b.title}</h3>
                  <div className="book-meta">
                    <span className="author">{b.author}</span>
                    {b.weeks_on_list ? (
                      <>
                        <span className="dot" aria-hidden>•</span>
                        <span className="weeks">{b.weeks_on_list} weeks</span>
                      </>
                    ) : null}
                  </div>
                  {b.description && (
                    <p className="book-desc">{b.description}</p>
                  )}
                  <div className="book-actions">
                    {b.amazon_product_url && (
                      <a
                        className="buy-link"
                        href={b.amazon_product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buy on Amazon →
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
};

export default BooksPage;


