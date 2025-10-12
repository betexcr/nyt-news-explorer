import React, { useMemo, useState, useEffect } from 'react';
import { useBestSellers, useBooksListByDate } from '../hooks/useApiCache';
import { BOOKS_LISTS } from '../api/nyt-apis';
import type { Book } from '../types/nyt.other';
import { mockBooks } from '../api/mock-data';
import { booksPrefetch } from '../lib/booksPrefetch';
import { useErrorReporter } from '../utils/errorReporter';
import '../styles/books.css';

const DEFAULT_LIST = 'hardcover-fiction';

const BooksPage: React.FC = () => {
  const [listName, setListName] = useState<string>(DEFAULT_LIST);
  const [date, setDate] = useState<string>('current'); // YYYY-MM-DD or 'current'
  const [prefetchStats, setPrefetchStats] = useState<any>(null);
  const { reportApiError } = useErrorReporter();

  const listOptions = useMemo(() => BOOKS_LISTS, []);

  // Update prefetch stats periodically
  useEffect(() => {
    const updateStats = () => {
      setPrefetchStats(booksPrefetch.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Use advanced caching hooks
  const isCurrent = date === 'current';
  
  const currentBooksQuery = useBestSellers(listName, isCurrent);
  const datedBooksQuery = useBooksListByDate(listName, date, !isCurrent);

  // Get the appropriate query based on date selection
  const activeQuery = isCurrent ? currentBooksQuery : datedBooksQuery;
  
  // Fallback to mock data if API is not available
  const USE_API = process.env.NODE_ENV === 'production' || !!process.env.REACT_APP_NYT_API_KEY;
  
  // Check if we have prefetched data for instant loading
  const prefetchedBooks = isCurrent ? booksPrefetch.getCachedBooks(listName) : null;
  const isPrefetched = isCurrent && booksPrefetch.isCategoryCached(listName);
  
  // Debug logging
  console.log(`[BOOKS PAGE] Current list: ${listName}`);
  console.log(`[BOOKS PAGE] Is current: ${isCurrent}`);
  console.log(`[BOOKS PAGE] Prefetched books:`, prefetchedBooks?.length || 0);
  console.log(`[BOOKS PAGE] Active query data:`, activeQuery.data?.length || 0);
  console.log(`[BOOKS PAGE] Is prefetched: ${isPrefetched}`);
  console.log(`[BOOKS PAGE] Active query loading:`, activeQuery.isLoading);
  console.log(`[BOOKS PAGE] Active query error:`, activeQuery.error);
  
  // Prioritize active query data over prefetched data to ensure fresh results
  // Only use prefetched data if active query is loading and we have prefetched data
  const books = USE_API ? (
    (activeQuery.data && activeQuery.data.length > 0) ? activeQuery.data :
    (activeQuery.isLoading && prefetchedBooks) ? prefetchedBooks :
    activeQuery.data || prefetchedBooks || []
  ) : mockBooks;
  
  const loading = USE_API ? (
    activeQuery.isLoading && !prefetchedBooks
  ) : false;
  const error = USE_API ? activeQuery.error : null;

  // Report API errors to error catcher
  useEffect(() => {
    if (error) {
      reportApiError(error, `books/${listName}`);
    }
  }, [error, listName, reportApiError]);

  // Handle invalid category selection
  const handleListChange = (newListName: string) => {
    // Validate that the selected list is in our valid categories
    if (BOOKS_LISTS.includes(newListName as any)) {
      setListName(newListName);
    } else {
      console.warn(`[BOOKS PAGE] Invalid category selected: ${newListName}, falling back to default`);
      setListName(DEFAULT_LIST);
      reportApiError(
        new Error(`Invalid book category: ${newListName}`), 
        'books/validation'
      );
    }
  };

  // Force refresh when list name changes to ensure fresh data
  useEffect(() => {
    if (isCurrent) {
      // Invalidate the query to force fresh data when switching categories
      currentBooksQuery.refetch();
    }
  }, [listName, isCurrent]); // Removed currentBooksQuery from dependencies to prevent infinite loop

  return (
    <div className="books-page">
              <header className="page-header">
                <div>
                  <h1 className="page-title">Books</h1>
                  <p className="page-subtitle">NYT Best Sellers lists</p>
                  {isCurrent && prefetchStats && (
                    <div className="prefetch-status">
                      <span className={`prefetch-indicator ${isPrefetched ? 'cached' : 'loading'}`}>
                        {isPrefetched ? '⚡ Instant' : '⏳ Loading...'}
                      </span>
                      <span className="prefetch-stats">
                        {prefetchStats.successful}/{prefetchStats.totalCategories} categories cached
                      </span>
                    </div>
                  )}
                </div>
              </header>

      <div className="books-controls" role="toolbar" aria-label="Books controls">
        <label className="list-select">
          List
            <select
              aria-label="Select best sellers list"
              value={listName}
              onChange={(e) => handleListChange(e.target.value)}
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
        <button
          type="button"
          className="retry-button"
          onClick={() => {
            booksPrefetch.clearBooksCache();
            // Force refresh by updating state
            setListName(prev => prev + '');
          }}
          aria-label="Clear cache and reload"
        >
          Clear Cache
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
      ) : (
        <section className="books-grid">
          {books.length === 0 ? (
            <div className="empty-state">No books found.</div>
          ) : (
                    books.slice(0, 24).map((b: Book) => (
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


