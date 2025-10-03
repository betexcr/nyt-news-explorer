import React, { useMemo, useState } from 'react';
import { useBestSellers, useBooksListByDate } from '../hooks/useApiCache';
import { BOOKS_LISTS } from '../api/nyt-apis';
import type { Book } from '../types/nyt.other';
import { mockBooks } from '../api/mock-data';
import '../styles/books.css';

const DEFAULT_LIST = 'hardcover-fiction';

const BooksPage: React.FC = () => {
  const [listName, setListName] = useState<string>(DEFAULT_LIST);
  const [date, setDate] = useState<string>('current'); // YYYY-MM-DD or 'current'

  const listOptions = useMemo(() => BOOKS_LISTS, []);

  // Use advanced caching hooks
  const isCurrent = date === 'current';
  
  const currentBooksQuery = useBestSellers(listName, isCurrent);
  const datedBooksQuery = useBooksListByDate(listName, date, !isCurrent);

  // Get the appropriate query based on date selection
  const activeQuery = isCurrent ? currentBooksQuery : datedBooksQuery;
  
  // Fallback to mock data if API is not available
  const USE_API = process.env.NODE_ENV === 'production' || !!process.env.REACT_APP_NYT_API_KEY;
  const books = USE_API ? (activeQuery.data || []) : mockBooks;
  const loading = USE_API ? activeQuery.isLoading : false;
  const error = USE_API ? activeQuery.error : null;

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


