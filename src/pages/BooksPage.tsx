import React, { useEffect, useMemo, useState } from 'react';
import { BOOKS_LISTS } from '../api/nyt-apis';
import { fetchBestsellers } from '../api/graphql-client';
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
    const USE_GRAPHQL = !!process.env.REACT_APP_GRAPHQL_ENDPOINT || true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!USE_GRAPHQL) {
          if (!cancelled) setBooks(mockBooks);
          return;
        }
        const results = await fetchBestsellers(listName, date);
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

  const formatPrice = (price: string) => {
    if (!price || price === '0.00') return 'Price not available';
    return `$${price}`;
  };

  const getRankChange = (current: number, last: number) => {
    if (last === 0) return null;
    const change = last - current;
    if (change === 0) return null;
    return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
  };

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
            min="2008-01-01"
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
                  <div className="rank-badge">
                    #{b.rank}
                    {getRankChange(b.rank, b.rank_last_week) && (
                      <span className="rank-change">{getRankChange(b.rank, b.rank_last_week)}</span>
                    )}
                  </div>
                  {b.asterisk > 0 && (
                    <div className="asterisk-badge" title="New this week">★</div>
                  )}
                  {b.dagger > 0 && (
                    <div className="dagger-badge" title="Returning to list">†</div>
                  )}
                </div>
                <div className="book-body">
                  <h3 className="book-title">{b.title}</h3>
                  
                  <div className="book-meta">
                    <span className="author">{b.author}</span>
                    {b.contributor && b.contributor !== b.author && (
                      <>
                        <span className="dot" aria-hidden>•</span>
                        <span className="contributor">{b.contributor}</span>
                      </>
                    )}
                  </div>

                  {b.publisher && (
                    <div className="book-publisher">
                      <span className="publisher-label">Publisher:</span> {b.publisher}
                    </div>
                  )}

                  {b.description && (
                    <p className="book-desc">{b.description}</p>
                  )}

                  <div className="book-details">
                    {b.weeks_on_list > 0 && (
                      <span className="detail-badge weeks">
                        {b.weeks_on_list} week{b.weeks_on_list !== 1 ? 's' : ''} on list
                      </span>
                    )}
                    {b.price && b.price !== '0.00' && (
                      <span className="detail-badge price">{formatPrice(b.price)}</span>
                    )}
                    {b.age_group && (
                      <span className="detail-badge age-group">{b.age_group}</span>
                    )}
                  </div>

                  {b.isbns && b.isbns.length > 0 && (
                    <div className="book-isbns">
                      {b.isbns.map((isbn, index) => (
                        <span key={index} className="isbn-badge">
                          {isbn.isbn13 ? `ISBN-13: ${isbn.isbn13}` : `ISBN-10: ${isbn.isbn10}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="book-links">
                    {b.book_review_link && (
                      <a
                        className="book-link review-link"
                        href={b.book_review_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read Review →
                      </a>
                    )}
                    {b.first_chapter_link && (
                      <a
                        className="book-link chapter-link"
                        href={b.first_chapter_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read First Chapter →
                      </a>
                    )}
                  </div>

                  <div className="book-actions">
                    {b.buy_links && b.buy_links.length > 0 ? (
                      <div className="buy-links">
                        {b.buy_links.slice(0, 3).map((link, index) => (
                          <a
                            key={index}
                            className="buy-link"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.name} →
                          </a>
                        ))}
                      </div>
                    ) : b.amazon_product_url ? (
                      <a
                        className="buy-link"
                        href={b.amazon_product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buy on Amazon →
                      </a>
                    ) : null}
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


