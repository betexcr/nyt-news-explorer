import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VirtualizedArticleList from '../VirtualizedArticleList';
import type { Article } from '../../types/nyt';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, height, itemSize }: any) => (
    <div data-testid="virtualized-list" style={{ height, width: '100%' }}>
      {Array.from({ length: Math.min(itemCount, 5) }, (_, index) => (
        <div key={index} style={{ height: itemSize }}>
          {children({ index, style: {} })}
        </div>
      ))}
    </div>
  ),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VirtualizedArticleList', () => {
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

  const mockArticle2: Article = {
    _id: 'test-id-2',
    web_url: 'https://example.com/article2',
    snippet: 'This is another test article snippet',
    headline: { main: 'Test Article Headline 2' },
    section_name: 'Test Section 2',
    byline: { original: 'By Test Author 2' },
    pub_date: '2023-01-02T00:00:00Z',
    multimedia: undefined,
    keywords: [
      { name: 'subject', value: 'Test Subject 2', rank: 1 },
    ],
  };

  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    mockOnLoadMore.mockClear();
  });

  test('renders virtualized list with articles', () => {
    const articles = [mockArticle, mockArticle2];
    renderWithRouter(
      <VirtualizedArticleList
        articles={articles}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('renders empty list when no articles', () => {
    renderWithRouter(
      <VirtualizedArticleList
        articles={[]}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('renders single article', () => {
    renderWithRouter(
      <VirtualizedArticleList
        articles={[mockArticle]}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('renders multiple articles', () => {
    const articles = [mockArticle, mockArticle2, mockArticle];
    renderWithRouter(
      <VirtualizedArticleList
        articles={articles}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('handles articles with undefined multimedia', () => {
    renderWithRouter(
      <VirtualizedArticleList
        articles={[mockArticle2]}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('handles large number of articles', () => {
    const articles = Array.from({ length: 100 }, (_, index) => ({
      ...mockArticle,
      _id: `test-id-${index}`,
      web_url: `https://example.com/article${index}`,
      headline: { main: `Test Article ${index}` },
    }));
    
    renderWithRouter(
      <VirtualizedArticleList
        articles={articles}
        height={400}
        itemHeight={100}
        hasMore={false}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    renderWithRouter(
      <VirtualizedArticleList
        articles={[mockArticle]}
        height={400}
        itemHeight={100}
        hasMore={true}
        loadingMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('handles hasMore state', () => {
    renderWithRouter(
      <VirtualizedArticleList
        articles={[mockArticle]}
        height={400}
        itemHeight={100}
        hasMore={true}
        loadingMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
}); 