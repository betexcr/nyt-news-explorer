import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '../HomePage';
import { MemoryRouter } from 'react-router-dom';
import { getMostPopular, getTopStories } from '../../api/nyt-graphql';

// Mock the API calls
jest.mock('../../api/nyt-apis');
const mockGetMostPopular = getMostPopular as jest.MockedFunction<typeof getMostPopular>;
const mockGetTopStories = getTopStories as jest.MockedFunction<typeof getTopStories>;

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMostPopular.mockResolvedValue([]);
    mockGetTopStories.mockResolvedValue([]);
  });

  test('renders home page with hero section', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('NYT News Explorer')).toBeInTheDocument();
    });
    
    // Check for hero content
    expect(screen.getByText('Discover the latest news from The New York Times')).toBeInTheDocument();
    
    // Check for at least one "Search Articles" link pointing to /search
    const searchLinks = screen.getAllByRole('link', { name: /search articles/i });
    expect(searchLinks.length).toBeGreaterThan(0);
    expect(searchLinks.some(link => link.getAttribute('href') === '/search')).toBe(true);
  });

  test('renders trending and top stories sections', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Trending This Week')).toBeInTheDocument();
    });
    
    // Check for sections (target the H2 heading specifically)
    expect(screen.getByRole('heading', { name: 'Top Stories', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Explore More')).toBeInTheDocument();
  });
});
