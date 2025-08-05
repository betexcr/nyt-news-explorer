import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FavoritesPage from '../FavoritesPage';
import { useSearchStore } from '../../store/searchStore';
import type { NytArticle } from '../../types/nyt';

// Mock the store
jest.mock('../../store/searchStore');
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

const mockArticle: NytArticle = {
  _id: '1',
  web_url: 'https://example.com/1',
  snippet: 'Test article snippet',
  headline: { main: 'Test Headline' },
  keywords: [],
  pub_date: '2024-01-01T00:00:00Z',
  multimedia: {},
  section_name: 'Test',
};

const mockFavorites: NytArticle[] = [
  mockArticle,
  {
    ...mockArticle,
    _id: '2',
    web_url: 'https://example.com/2',
    headline: { main: 'Second Headline' },
  },
];

describe('FavoritesPage', () => {
  const mockRemoveFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when no favorites', () => {
    mockUseSearchStore.mockReturnValue({
      favorites: [],
      removeFavorite: mockRemoveFavorite,
    });

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText("You haven't added any articles to your favorites yet.")).toBeInTheDocument();
    expect(screen.getByText('Search for articles and click the heart icon to add them to your favorites.')).toBeInTheDocument();
  });

  test('renders favorites list with count', () => {
    mockUseSearchStore.mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
    });

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Favorites (2)')).toBeInTheDocument();
    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText('Second Headline')).toBeInTheDocument();
    // Use getAllByText since there are multiple instances
    const snippets = screen.getAllByText('Test article snippet');
    expect(snippets).toHaveLength(2);
  });

  test('calls removeFavorite when remove button is clicked', () => {
    mockUseSearchStore.mockReturnValue({
      favorites: [mockArticle],
      removeFavorite: mockRemoveFavorite,
    });

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    // Get the remove button from FavoritesPage (not ArticleCard)
    const removeButtons = screen.getAllByTitle('Remove from favorites');
    const favoritesPageRemoveButton = removeButtons.find(button => button.textContent === '×');
    expect(favoritesPageRemoveButton).toBeInTheDocument();
    
    fireEvent.click(favoritesPageRemoveButton!);

    expect(mockRemoveFavorite).toHaveBeenCalledWith(mockArticle.web_url);
  });

  test('renders multiple remove buttons for multiple favorites', () => {
    mockUseSearchStore.mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
    });

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    // Get only the remove buttons from FavoritesPage (× buttons)
    const removeButtons = screen.getAllByTitle('Remove from favorites');
    const favoritesPageRemoveButtons = removeButtons.filter(button => button.textContent === '×');
    expect(favoritesPageRemoveButtons).toHaveLength(2);
  });
}); 