import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SearchPage from '../SearchPage';
import { searchArticles, searchArticlesAdv } from '../../api/nyt';
import { useSearchStore } from '../../store/searchStore';
import type { Article } from '../../types/nyt';

// Mock the API
jest.mock('../../api/nyt');
const mockSearchArticles = searchArticles as jest.MockedFunction<typeof searchArticles>;
const mockSearchArticlesAdv = searchArticlesAdv as jest.MockedFunction<typeof searchArticlesAdv>;

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

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStore.mockReturnValue(mockStore);
    mockSearchArticles.mockResolvedValue(mockArticles);
    mockSearchArticlesAdv.mockResolvedValue(mockArticles);
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

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  test('renders advanced search toggle button', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument();
  });

  test('handles view mode toggle', async () => {
    const user = userEvent.setup();
    
    // Mock store with articles and hasSearched
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: mockArticles,
      hasSearched: true,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const gridButton = screen.getByLabelText('Grid view');
    const tableButton = screen.getByLabelText('Table view');

    // Initially should be in grid mode
    expect(gridButton).toHaveClass('active');
    expect(tableButton).not.toHaveClass('active');

    // Click table button
    await user.click(tableButton);
    expect(mockStore.setViewMode).toHaveBeenCalledWith('table');

    // Click grid button
    await user.click(gridButton);
    expect(mockStore.setViewMode).toHaveBeenCalledWith('grid');
  });

  test('handles search with loading state', async () => {
    
    // Mock loading state
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      loading: true,
    });

    const { container } = render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    // Check for spinner container
    expect(container.querySelector('.spinner-container')).toBeInTheDocument();
  });

  test('prevents search with empty query', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockSearchArticles).not.toHaveBeenCalled();
  });

  test('handles fromHome state correctly', () => {
    mockUseLocation.mockReturnValue({ 
      state: { fromHome: true } 
    } as any);

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(mockStore.reset).toHaveBeenCalled();
  });

  test('renders articles in grid view', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: mockArticles,
      hasSearched: true,
      viewMode: 'grid',
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline 1')).toBeInTheDocument();
    expect(screen.getByText('Headline 2')).toBeInTheDocument();
  });

  test('renders articles in table view', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: mockArticles,
      hasSearched: true,
      viewMode: 'table',
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline 1')).toBeInTheDocument();
    expect(screen.getByText('Headline 2')).toBeInTheDocument();
  });

  test('toggles advanced search form', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const advancedButton = screen.getByRole('button', { name: /advanced/i });
    
    // Initially should show "Advanced"
    expect(advancedButton).toHaveTextContent('Advanced');
    
    // Click to show advanced form
    await user.click(advancedButton);
    
    // Should now show "Simple"
    expect(advancedButton).toHaveTextContent('Simple');
    
    // Click again to hide advanced form
    await user.click(advancedButton);
    
    // Should show "Advanced" again
    expect(advancedButton).toHaveTextContent('Advanced');
  });

  test('shows results count when articles are found', () => {
    mockUseSearchStore.mockReturnValue({
      ...mockStore,
      articles: mockArticles,
      hasSearched: true,
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/showing 2 results/i)).toBeInTheDocument();
  });

  test('does not show results count when no articles', () => {
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

    expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
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

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
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

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
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
});
