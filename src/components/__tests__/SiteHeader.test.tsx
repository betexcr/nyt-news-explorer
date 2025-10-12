import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteHeader } from '../SiteHeader';
import { useSearchStore } from '../../store/searchStore';

// Mock the store
jest.mock('../../store/searchStore');
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

// Mock ThemeToggle component
jest.mock('../ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

describe('SiteHeader', () => {
  const mockReset = jest.fn();

  const mockState = {
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
    reset: mockReset,
    clearCache: jest.fn(),
    exportCache: jest.fn(),
    importCache: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });
  });

  test('renders header with logo and navigation', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.getByText('NYT News Explorer')).toBeInTheDocument();
    expect(screen.getByText('by Alberto Muñoz')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
  });

  test('toggles options dropdown when Options button is clicked', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const optionsButton = screen.getByText('Options');
    fireEvent.click(optionsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Clear Cache')).toBeInTheDocument();
  });

  test('calls reset and clears storage when Clear Cache is clicked', () => {
    const mockSessionStorage = {
      clear: jest.fn(),
    };
    const mockLocalStorage = {
      clear: jest.fn(),
    };
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const optionsButton = screen.getByText('Options');
    fireEvent.click(optionsButton);

    const clearCacheButton = screen.getByText('Clear Cache');
    fireEvent.click(clearCacheButton);

    expect(mockReset).toHaveBeenCalled();
    expect(mockSessionStorage.clear).toHaveBeenCalled();
    expect(mockLocalStorage.clear).toHaveBeenCalled();
  });

  test('toggles mobile menu when hamburger button is clicked', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const mobileMenuButton = screen.getByRole('button', { name: '' });
    fireEvent.click(mobileMenuButton);

    // Check for mobile menu content - should be visible after clicking
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Clear Cache')).toBeInTheDocument();
  });

  test('closes mobile menu when Escape key is pressed', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const mobileMenuButton = screen.getByRole('button', { name: '' });
    fireEvent.click(mobileMenuButton);

    // Menu should be open
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Menu should be closed
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  test('closes dropdowns when clicking outside', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const optionsButton = screen.getByText('Options');
    fireEvent.click(optionsButton);

    // Dropdown should be open
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    // Dropdown should be closed
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  test('includes ThemeToggle component in settings', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    const optionsButton = screen.getByText('Options');
    fireEvent.click(optionsButton);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
