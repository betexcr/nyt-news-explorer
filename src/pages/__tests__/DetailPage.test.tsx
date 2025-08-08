import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import DetailPage from '../DetailPage';
import { getArticleByUrl } from '../../api/nyt';
import type { Article } from '../../types/nyt';

// Mock the API
jest.mock('../../api/nyt');
const mockGetArticleByUrl = getArticleByUrl as jest.MockedFunction<typeof getArticleByUrl>;

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

const mockNavigate = jest.fn();

const baseArticle: Article = {
  _id: 'test-id',
  web_url: 'https://example.com/article',
  snippet: 'Test article snippet',
  headline: { main: 'Test Headline' },
  keywords: [],
  pub_date: '2024-01-01T00:00:00Z',
  multimedia: {
    default: {
      url: 'https://example.com/image.jpg',
      height: 300,
      width: 400,
    },
  },
  byline: { original: 'By John Doe' },
  section_name: 'World',
  lead_paragraph: 'This is the lead paragraph.',
};

describe('DetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    mockUseLocation.mockReturnValue({ state: undefined } as any);
  });

  test('renders article details when article is provided via state', () => {
    mockUseLocation.mockReturnValue({ state: { article: baseArticle } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText('Test article snippet')).toBeInTheDocument();
    expect(screen.getByText('By John Doe')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('This is the lead paragraph.')).toBeInTheDocument();
    // Note: No "Open full article" link when no URL parameter
  });

  test('renders article details when URL is provided', async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?url=https://example.com/article'),
      jest.fn(),
    ]);
    mockGetArticleByUrl.mockResolvedValue(baseArticle);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Headline')).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching article', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?url=https://example.com/article'),
      jest.fn(),
    ]);
    mockGetArticleByUrl.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('navigates back when no URL and no article', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    mockUseLocation.mockReturnValue({ state: undefined } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('returns null when no URL and no article', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    mockUseLocation.mockReturnValue({ state: undefined } as any);

    const { container } = render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    // Should not render anything when no URL and no article
    expect(container.innerHTML).toBe('');
  });

  test('renders fallback image when multimedia is missing', () => {
    const articleWithoutMultimedia = { ...baseArticle, multimedia: undefined };
    mockUseLocation.mockReturnValue({ state: { article: articleWithoutMultimedia } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('renders fallback image when multimedia.default is missing', () => {
    const articleWithoutDefault = { ...baseArticle, multimedia: {} };
    mockUseLocation.mockReturnValue({ state: { article: articleWithoutDefault } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('renders fallback image when multimedia.default.url is missing', () => {
    const articleWithoutUrl = {
      ...baseArticle,
      multimedia: { default: { height: 300, width: 400 } },
    };
    mockUseLocation.mockReturnValue({ state: { article: articleWithoutUrl } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('renders article with multimedia image when available', () => {
    mockUseLocation.mockReturnValue({ state: { article: baseArticle } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('handles missing optional fields gracefully', () => {
    const minimalArticle = {
      _id: 'test-id',
      web_url: 'https://example.com/article',
      snippet: 'Test article snippet',
      headline: { main: 'Test Headline' },
      keywords: [],
      pub_date: '2024-01-01T00:00:00Z',
    };
    mockUseLocation.mockReturnValue({ state: { article: minimalArticle } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText('Test article snippet')).toBeInTheDocument();
    // Should not crash when optional fields are missing
  });

  test('handles empty headline gracefully', () => {
    const articleWithEmptyHeadline = { ...baseArticle, headline: { main: '' } };
    mockUseLocation.mockReturnValue({ state: { article: articleWithEmptyHeadline } } as any);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('');
  });

  test('handles null article gracefully', () => {
    mockUseLocation.mockReturnValue({ state: { article: null } } as any);

    const { container } = render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    // Should not crash when article is null, but should return null
    expect(container.innerHTML).toBe('');
  });

  test('handles API errors gracefully', async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?url=https://example.com/article'),
      jest.fn(),
    ]);
    mockGetArticleByUrl.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  test('renders byline when available', async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?url=https://example.com/article'),
      jest.fn(),
    ]);
    mockGetArticleByUrl.mockResolvedValue(baseArticle);

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>
    );

    await screen.findByText('By John Doe');
  });
});
