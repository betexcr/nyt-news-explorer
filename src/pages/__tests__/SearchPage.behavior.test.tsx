import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from '../../pages/SearchPage';
import { useSearchStore } from '../../store/searchStore';

jest.setTimeout(15000);
jest.useFakeTimers();
 
const mockSearch = jest.fn<Promise<any[]>, [string]>();
jest.mock('../../api/nyt', () => ({
  makeSearchController: () => mockSearch,
}));
 
let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  (window as any).scrollTo = jest.fn();
  mockSearch.mockReset();
  useSearchStore.getState().reset();
  user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
});

describe('SearchPage behavior', () => {
  const renderPage = (initialEntries?: any) =>
    render(
      <MemoryRouter initialEntries={initialEntries || ['/search']}>
        <SearchPage />
      </MemoryRouter>
    );

  test('debounce: types then waits 350ms before calling search', async () => {
    mockSearch.mockResolvedValueOnce([]);
    renderPage();

    const input = screen.getByRole('textbox', { name: /search input/i });
    await user.type(input, 'climate');
 
    jest.advanceTimersByTime(349);
    expect(mockSearch).not.toHaveBeenCalled();
 
    jest.advanceTimersByTime(1);
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(mockSearch).toHaveBeenCalledWith('climate');
  });

  test('submit bypasses debounce and calls immediately', async () => {
    const result = [
      { _id: '1', web_url: 'https://x', snippet: 's', headline: { main: 'H' }, pub_date: '2020-01-01T00:00:00Z' },
    ];
    const deferred = defer<any[]>();
    mockSearch.mockReturnValueOnce(deferred.promise);

    renderPage();

    const input = screen.getByRole('textbox', { name: /search input/i });
    await user.clear(input);
    await user.type(input, 'election');

    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form')!);
 
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('election');
 
    deferred.resolve(result);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /H/i })).toBeInTheDocument();
    });
  });

  test('handles empty input -> clears results and shows "No results"', async () => {
    renderPage();

    const input = screen.getByRole('textbox', { name: /search input/i });
    await user.clear(input);
 
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form')!);

    await waitFor(() => expect(screen.getByText(/no results/i)).toBeInTheDocument());
  });

  test('error path: API rejection clears results gracefully', async () => {
    mockSearch.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    const input = screen.getByRole('textbox', { name: /search input/i });
    await user.clear(input);
    await user.type(input, 'ukraine');

    jest.advanceTimersByTime(350);
    await waitFor(() => expect(screen.getByText(/no results/i)).toBeInTheDocument());
  });

  test('restores scroll when there are results and saved scrollY', async () => {
    // Pre-populate store to trigger the effect
    useSearchStore.setState({
      hasSearched: true,
      query: 'q',
      articles: [
        { _id: 'a1', web_url: 'https://example.com/a1', snippet: 's', headline: { main: 'A1' }, pub_date: '2020-01-01T00:00:00Z' },
      ],
      scrollY: 300,
    });

    const img = document.createElement('img');
    img.className = 'thumb';
    Object.defineProperty(img, 'complete', { value: true });
    document.body.appendChild(img);

    renderPage();

    jest.advanceTimersByTime(1500);

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 300));
  });

  test('navigating from home resets state (fromHome flag)', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/search', state: { fromHome: true } }]}>
        <SearchPage />
      </MemoryRouter>
    );
    const { query, articles, hasSearched, scrollY } = useSearchStore.getState();
    expect(query).toBe('');
    expect(articles).toEqual([]);
    expect(hasSearched).toBe(false);
    expect(scrollY).toBe(0);
  });
});

function defer<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
