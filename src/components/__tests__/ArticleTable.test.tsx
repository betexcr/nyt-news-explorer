import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleTable from '../ArticleTable';
import type { Article } from '../../types/nyt';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ArticleTable', () => {
  const mockArticle: Article = {
    _id: 'test-id',
    web_url: 'https://example.com/article',
    snippet: 'This is a test article snippet',
    headline: { main: 'Test Article Headline' },
    section_name: 'Test Section',
    byline: { original: 'By Test Author' },
    pub_date: '2023-01-01T00:00:00Z',
    multimedia: {
      caption: 'Test Caption',
      credit: 'Test Credit',
      default: { url: 'https://example.com/image.jpg', height: 100, width: 100 },
      thumbnail: { url: 'https://example.com/thumb.jpg', height: 50, width: 50 },
    },
    keywords: [
      { name: 'subject', value: 'Test Subject', rank: 1 },
      { name: 'glocations', value: 'Test Location', rank: 2 },
    ],
  };

  const mockArticleWithoutImage: Article = {
    _id: 'test-id-2',
    web_url: 'https://example.com/article2',
    snippet: 'This is another test article snippet',
    headline: { main: 'Test Article Headline 2' },
    section_name: 'Test Section 2',
    byline: { original: 'By Test Author 2' },
    pub_date: '2023-01-02T00:00:00Z',
    multimedia: {},
    keywords: [
      { name: 'subject', value: 'Test Subject 2', rank: 1 },
    ],
  };

  const mockArticleWithOnlyThumbnail: Article = {
    _id: 'test-id-3',
    web_url: 'https://example.com/article3',
    snippet: 'This is a third test article snippet',
    headline: { main: 'Test Article Headline 3' },
    section_name: 'Test Section 3',
    byline: { original: 'By Test Author 3' },
    pub_date: '2023-01-03T00:00:00Z',
    multimedia: {
      caption: 'Test Caption 3',
      credit: 'Test Credit 3',
      thumbnail: { url: 'https://example.com/thumb3.jpg', height: 50, width: 50 },
    },
    keywords: [
      { name: 'subject', value: 'Test Subject 3', rank: 1 },
    ],
  };

  const mockArticleWithOnlyDefault: Article = {
    _id: 'test-id-4',
    web_url: 'https://example.com/article4',
    snippet: 'This is a fourth test article snippet',
    headline: { main: 'Test Article Headline 4' },
    section_name: 'Test Section 4',
    byline: { original: 'By Test Author 4' },
    pub_date: '2023-01-04T00:00:00Z',
    multimedia: {
      caption: 'Test Caption 4',
      credit: 'Test Credit 4',
      default: { url: 'https://example.com/image4.jpg', height: 100, width: 100 },
    },
    keywords: [
      { name: 'subject', value: 'Test Subject 4', rank: 1 },
    ],
  };

  const mockArticleWithNullValues: Article = {
    _id: 'test-id-5',
    web_url: 'https://example.com/article5',
    snippet: 'This is a fifth test article snippet',
    headline: { main: 'Test Article Headline 5' },
    section_name: undefined,
    byline: { original: 'By Test Author 5' },
    pub_date: '2023-01-05T00:00:00Z',
    multimedia: {},
    keywords: [
      { name: 'subject', value: 'Test Subject 5', rank: 1 },
    ],
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders table with articles', () => {
    const articles = [mockArticle, mockArticleWithoutImage];
    render(
      <MemoryRouter>
        <ArticleTable articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Test Article Headline 2')).toBeInTheDocument();
  });

  test('handles article with thumbnail image', () => {
    const articles = [mockArticleWithOnlyThumbnail];
    render(
      <MemoryRouter>
        <ArticleTable articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Article Headline 3')).toBeInTheDocument();
  });

  test('handles article with default image', () => {
    const articles = [mockArticleWithOnlyDefault];
    render(
      <MemoryRouter>
        <ArticleTable articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Article Headline 4')).toBeInTheDocument();
  });

  test('handles article with null values', () => {
    const articles = [mockArticleWithNullValues];
    render(
      <MemoryRouter>
        <ArticleTable articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Article Headline 5')).toBeInTheDocument();
    expect(screen.getByText('By Test Author 5')).toBeInTheDocument();
  });

  test('navigates to detail page when row is clicked', () => {
    const articles = [mockArticle];
    render(
      <MemoryRouter>
        <ArticleTable articles={articles} />
      </MemoryRouter>
    );

    const row = screen.getByText('Test Article Headline').closest('tr');
    if (row) {
      fireEvent.click(row);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/detail', {
      state: { article: mockArticle }
    });
  });
}); 