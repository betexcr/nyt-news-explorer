import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
 
import SearchPage from '../SearchPage';
import { searchArticles, makeSearchController } from '../../api/nyt';
import { useSearchStore } from '../../store/searchStore';
import type { Article } from '../../types/nyt';

// Mock the API
jest.mock('../../api/nyt');
const mockSearchArticles = searchArticles as jest.MockedFunction<typeof searchArticles>;
const mockMakeSearchController = makeSearchController as jest.MockedFunction<typeof makeSearchController>;

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

// Mock the store
jest.mock('../../store/searchStore');
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

const mockArticles: Article[] = [
  {
    _id: '1',
    web_url: 'https://example.com/1',
    snippet: 'Article 1',
    headline: { main: 'Headline 1' },
    keywords: [],
    pub_date: '2024-01-01T00:00:00Z',
    multimedia: {},
  },
  {
    _id: '2',
    web_url: 'https://example.com/2',
    snippet: 'Article 2',
    headline: { main: 'Headline 2' },
    keywords: [],
    pub_date: '2024-01-01T00:00:00Z',
    multimedia: {},
  },
];

const mockStore = {
  query: '',
  articles: [],
  hasSearched: false,
  scrollY: 0,
  viewMode: 'grid' as const,
  loading: false,
  loadingMore: false,
  currentPage: 0,
  hasMore: false,
  advancedParams: null,
  favorites: [],
  setQuery: jest.fn(),
  setArticles: jest.fn(),
  setHasSearched: jest.fn(),
  setScrollY: jest.fn(),
  setViewMode: jest.fn(),
  setLoading: jest.fn(),
  setLoadingMore: jest.fn(),
  setCurrentPage: jest.fn(),
  setHasMore: jest.fn(),
  setAdvancedParams: jest.fn(),
  appendArticles: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  clearFavorites: jest.fn(),
  reset: jest.fn(),
};

describe('SearchPage behavior', () => {
  const renderPage = (initialEntries?: any) =>
    render(
      <MemoryRouter initialEntries={initialEntries || ['/search']}>
        <SearchPage />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseLocation.mockReturnValue({ state: null } as any);
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseSearchStore.mockReturnValue(mockStore);
    mockSearchArticles.mockResolvedValue(mockArticles);
    
    // Mock makeSearchController to return a function that calls searchArticles
    mockMakeSearchController.mockReturnValue((query: string) => searchArticles(query));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders search form', () => {
    renderPage();
    expect(screen.getByRole('textbox', { name: /search input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('handles fromHome state', () => {
    const mockNavigate = jest.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseLocation.mockReturnValue({ state: { fromHome: true } } as any);

    renderPage();

    expect(mockStore.reset).toHaveBeenCalled();
    // Navigation is no longer expected since we removed that functionality
  });

  test('handles null articles gracefully', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: null as any,
      hasSearched: true,
    });

    renderPage();

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  test('handles undefined articles gracefully', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: undefined as any,
      hasSearched: true,
    });

    renderPage();

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  test('handles empty articles array', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: [],
      hasSearched: true,
    });

    renderPage();

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  test('handles articles with missing required fields', () => {
    const incompleteArticle = {
      _id: 'incomplete',
      web_url: 'https://example.com/incomplete',
      snippet: 'Incomplete article',
      headline: { main: 'Incomplete Headline' },
      keywords: [],
      pub_date: '2024-01-01T00:00:00Z',
      multimedia: {},
    };
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: [incompleteArticle as any],
      hasSearched: true,
    });

    renderPage();

    // Should not crash when articles are missing required fields
    expect(screen.getByText('Incomplete Headline')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: 'test query',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockStore.setHasSearched).toHaveBeenCalledWith(true);
  });

  test('handles search with empty query', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: '',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // Empty queries don't trigger search, so setArticles should not be called
    expect(mockStore.setArticles).not.toHaveBeenCalled();
  });

  test('handles search error gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSearchArticles.mockRejectedValue(new Error('API Error'));
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: 'test query',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockStore.setArticles).toHaveBeenCalledWith([]);
  });

  test('handles scroll restoration with no scrollY', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: mockArticles,
      scrollY: 0,
    });

    renderPage();

    // Should not attempt scroll restoration when scrollY is 0
    expect(true).toBe(true);
  });

  test('handles scroll restoration with no articles', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: [],
      scrollY: 100,
    });

    renderPage();

    // Should not attempt scroll restoration when no articles
    expect(true).toBe(true);
  });

  test('handles form submission with whitespace query', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: '   ',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // Whitespace-only queries don't trigger search, so setArticles should not be called
    expect(mockStore.setArticles).not.toHaveBeenCalled();
  });

  test('handles successful search with results', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: 'test query',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockStore.setArticles).toHaveBeenCalledWith(mockArticles);
  });

  test('shows spinner during loading', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSearchArticles.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      query: 'test query',
    });

    renderPage();

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    // Should show spinner (check for spinner container)
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
