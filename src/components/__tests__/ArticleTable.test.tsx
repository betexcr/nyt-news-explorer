import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArticleTable from '../ArticleTable';
import type { NytArticle } from '../../types/nyt';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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

const mockArticleWithoutImage: NytArticle = {
  _id: 'test-id-2',
  web_url: 'https://example.com/article2',
  headline: { main: 'Test Article Without Image' },
  section_name: 'Science',
  byline: { original: 'By Jane Smith' },
  pub_date: '2024-01-16T10:00:00Z',
  multimedia: null
};

const mockArticleWithOnlyThumbnail: NytArticle = {
  _id: 'test-id-3',
  web_url: 'https://example.com/article3',
  headline: { main: 'Test Article With Only Thumbnail' },
  section_name: 'Politics',
  byline: { original: 'By Bob Wilson' },
  pub_date: '2024-01-17T10:00:00Z',
  multimedia: {
    caption: 'Test caption',
    credit: 'Test credit',
    thumbnail: {
      url: 'https://example.com/thumb-only.jpg',
      height: 75,
      width: 75
    }
  }
};

const mockArticleWithOnlyDefault: NytArticle = {
  _id: 'test-id-4',
  web_url: 'https://example.com/article4',
  headline: { main: 'Test Article With Only Default' },
  section_name: 'Sports',
  byline: { original: 'By Alice Brown' },
  pub_date: '2024-01-18T10:00:00Z',
  multimedia: {
    caption: 'Test caption',
    credit: 'Test credit',
    default: {
      url: 'https://example.com/default-only.jpg',
      height: 600,
      width: 800
    }
  }
};

const mockArticleWithMissingFields: NytArticle = {
  _id: 'test-id-5',
  web_url: 'https://example.com/article5',
  headline: null,
  section_name: null,
  byline: null,
  pub_date: null,
  multimedia: null
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ArticleTable', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders table with articles', () => {
    renderWithRouter(<ArticleTable articles={[mockArticle]} />);
    
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('By John Doe')).toBeInTheDocument();
  });

  test('displays thumbnail image when available', () => {
    renderWithRouter(<ArticleTable articles={[mockArticle]} />);
    
    const image = screen.getByAltText('Article thumbnail');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  test('displays "No Image" when no multimedia is available', () => {
    renderWithRouter(<ArticleTable articles={[mockArticleWithoutImage]} />);
    
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByAltText('Article thumbnail')).not.toBeInTheDocument();
  });

  test('displays thumbnail when only thumbnail is available', () => {
    renderWithRouter(<ArticleTable articles={[mockArticleWithOnlyThumbnail]} />);
    
    const image = screen.getByAltText('Article thumbnail');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/thumb-only.jpg');
  });

  test('displays default image when only default is available', () => {
    renderWithRouter(<ArticleTable articles={[mockArticleWithOnlyDefault]} />);
    
    const image = screen.getByAltText('Article thumbnail');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/default-only.jpg');
  });

  test('handles missing article fields gracefully', () => {
    renderWithRouter(<ArticleTable articles={[mockArticleWithMissingFields]} />);
    
    expect(screen.getByText('No title')).toBeInTheDocument();
    expect(screen.getByText('No section')).toBeInTheDocument();
    expect(screen.getByText('No author')).toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  test('navigates to detail page when row is clicked', () => {
    renderWithRouter(<ArticleTable articles={[mockArticle]} />);
    
    const row = screen.getByText('Test Article Headline').closest('tr');
    fireEvent.click(row!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/detail', {
      state: { article: mockArticle }
    });
  });

  test('handles image error by hiding image and showing no-image div', () => {
    renderWithRouter(<ArticleTable articles={[mockArticle]} />);
    
    const image = screen.getByAltText('Article thumbnail');
    const noImageDiv = screen.getByText('No Image');
    
    // Initially, no-image div should have 'hidden' class
    expect(noImageDiv).toHaveClass('hidden');
    
    // Simulate image error
    fireEvent.error(image);
    
    // After error, image should be hidden and no-image div should be visible
    expect(image).toHaveStyle({ display: 'none' });
    expect(noImageDiv).not.toHaveClass('hidden');
  });

  test('formats date correctly', () => {
    renderWithRouter(<ArticleTable articles={[mockArticle]} />);
    
    // The date should be formatted as "Jan 15, 2024"
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  test('renders multiple articles', () => {
    const articles = [mockArticle, mockArticleWithoutImage];
    renderWithRouter(<ArticleTable articles={articles} />);
    
    expect(screen.getByText('Test Article Headline')).toBeInTheDocument();
    expect(screen.getByText('Test Article Without Image')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
  });

  test('renders empty table when no articles provided', () => {
    renderWithRouter(<ArticleTable articles={[]} />);
    
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Headline')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    
    // Should not have any article content
    expect(screen.queryByText('Test Article Headline')).not.toBeInTheDocument();
  });
}); 