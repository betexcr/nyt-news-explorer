import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SearchPage from '../SearchPage';
import { searchArticles } from '../../api/nyt';
import { useSearchStore } from '../../store/searchStore';
import type { Article } from '../../types/nyt';

// Mock the API
jest.mock('../../api/nyt');
const mockSearchArticles = searchArticles as jest.MockedFunction<typeof searchArticles>;

// Mock the store
jest.mock('../../store/searchStore');
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

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
  totalResults: 0,
  currentPage: 0,
  hasMore: false,
  advancedParams: null,
  setQuery: jest.fn(),
  setArticles: jest.fn(),
  setHasSearched: jest.fn(),
  setScrollY: jest.fn(),
  setViewMode: jest.fn(),
  setLoading: jest.fn(),
  setTotalResults: jest.fn(),
  setCurrentPage: jest.fn(),
  setHasMore: jest.fn(),
  setAdvancedParams: jest.fn(),
  appendArticles: jest.fn(),
  reset: jest.fn(),
};

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStore.mockReturnValue(mockStore);
    mockSearchArticles.mockResolvedValue(mockArticles);
    mockUseLocation.mockReturnValue({ state: undefined } as any);
  });

  test('renders search form', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('textbox', { name: /search input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('handles empty search results', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: [],
      hasSearched: true,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  test('handles null articles', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: null as any,
      hasSearched: true,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  test('handles undefined articles', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: undefined as any,
      hasSearched: true,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

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

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    // Should not crash when articles are missing required fields
    expect(screen.getByText('Incomplete Headline')).toBeInTheDocument();
  });

  test('handles window scroll events', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    // Simulate scroll event
    Object.defineProperty(window, 'scrollY', {
      value: 150,
      writable: true,
    });
    window.dispatchEvent(new Event('scroll'));

    expect(mockStore.setScrollY).toHaveBeenCalledWith(150);
  });

  test('handles window scrollY being undefined', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    // Simulate scroll event with undefined scrollY
    Object.defineProperty(window, 'scrollY', {
      value: undefined,
      writable: true,
    });
    window.dispatchEvent(new Event('scroll'));

    expect(mockStore.setScrollY).toHaveBeenCalledWith(0);
  });

  test('handles fromHome state', () => {
    // Mock useLocation to return fromHome state
    mockUseLocation.mockReturnValue({ state: { fromHome: true } } as any);

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(mockStore.reset).toHaveBeenCalled();
  });
});
