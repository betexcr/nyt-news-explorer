import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VirtualizedArticleList from '../VirtualizedArticleList';
import type { NytArticle } from '../../types/nyt';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, height, itemSize, width, className }: any) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: { height: itemSize } }));
    }
    return (
      <div 
        data-testid="virtualized-list" 
        style={{ height, width }}
        className={className}
      >
        {items}
      </div>
    );
  }
}));

const mockArticle: NytArticle = {
  _id: 'test-id',
  web_url: 'https://example.com/article',
  headline: { main: 'Test Article Headline' },
  section_name: 'Technology',
  byline: { original: 'By John Doe' },
  pub_date: '2024-01-15T10:00:00Z',
  multimedia: {
    caption: 'Test caption',
    credit: 'Test credit',
    default: {
      url: 'https://example.com/image.jpg',
      height: 600,
      width: 800
    },
    thumbnail: {
      url: 'https://example.com/thumb.jpg',
      height: 75,
      width: 75
    }
  }
};

const mockArticle2: NytArticle = {
  _id: 'test-id-2',
  web_url: 'https://example.com/article2',
  headline: { main: 'Test Article 2' },
  section_name: 'Science',
  byline: { original: 'By Jane Smith' },
  pub_date: '2024-01-16T10:00:00Z',
  multimedia: undefined
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VirtualizedArticleList', () => {
  test('renders virtualized list container', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  test('renders articles in the list', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle, mockArticle2]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
  });

  test('applies correct height and width props', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle]} 
        height={500} 
        itemHeight={150} 
      />
    );
    
    const list = screen.getByTestId('virtualized-list');
    expect(list).toHaveStyle({ height: '500px', width: '100%' });
  });

  test('applies correct CSS classes', () => {
    const { container } = renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(container.firstChild).toHaveClass('virtualized-list-container');
    expect(screen.getByTestId('virtualized-list')).toHaveClass('virtualized-list');
  });

  test('renders empty list when no articles provided', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    expect(screen.queryByText('Test Article Headline')).not.toBeInTheDocument();
  });

  test('renders single article correctly', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.queryByText('Test Article 2')).not.toBeInTheDocument();
  });

  test('renders multiple articles correctly', () => {
    const articles = [mockArticle, mockArticle2];
    renderWithRouter(
      <VirtualizedArticleList 
        articles={articles} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
  });

  test('passes correct props to react-window List', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle, mockArticle2]} 
        height={300} 
        itemHeight={80} 
      />
    );
    
    const list = screen.getByTestId('virtualized-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveStyle({ height: '300px' });
  });

  test('renders ArticleCard components for each article', () => {
    renderWithRouter(
      <VirtualizedArticleList 
        articles={[mockArticle, mockArticle2]} 
        height={400} 
        itemHeight={100} 
      />
    );
    
    // Check that ArticleCard content is rendered
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    expect(screen.getByText(/Technology/)).toBeInTheDocument();
    expect(screen.getByText(/Science/)).toBeInTheDocument();
  });
}); 