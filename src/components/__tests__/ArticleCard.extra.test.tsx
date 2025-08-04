import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ArticleCard from '../ArticleCard';
import { useSearchStore } from '../../store/searchStore';
import type { Article } from '../../types/nyt';

const baseArticle: Article = {
  _id: 'id-1',
  web_url: 'https://example.com/one',
  snippet: 'Snippet one',
  headline: { main: 'Headline One' },
  pub_date: '2022-02-02T00:00:00Z',
  section_name: 'World',
  multimedia: {} as any,
  keywords: [],
};

describe('ArticleCard extra tests', () => {
  beforeEach(() => {
    useSearchStore.getState().reset();
  });

  test('renders fallback image when multimedia is missing', () => {
    render(
      <MemoryRouter>
        <ArticleCard article={{ ...baseArticle, multimedia: {} as any }} />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('renders fallback image when multimedia is null', () => {
    render(
      <MemoryRouter>
        <ArticleCard article={{ ...baseArticle, multimedia: null as any }} />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('renders fallback image when multimedia is undefined', () => {
    render(
      <MemoryRouter>
        <ArticleCard article={{ ...baseArticle, multimedia: undefined as any }} />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('handles multimedia with default but no url', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { default: {} } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('handles multimedia with default and url', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { default: { url: 'https://example.com/image.jpg' } } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('handles multimedia with default and url but missing height/width', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { 
              default: { 
                url: 'https://example.com/image.jpg',
                height: undefined,
                width: undefined,
              } 
            } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('handles multimedia with thumbnail but no default', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { 
              thumbnail: { url: 'https://example.com/thumb.jpg' } 
            } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg'
    );
  });

  test('handles multimedia with both default and thumbnail', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { 
              default: { url: 'https://example.com/default.jpg' },
              thumbnail: { url: 'https://example.com/thumb.jpg' }
            } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/default.jpg');
  });

  test('handles multimedia with caption and credit', () => {
    render(
      <MemoryRouter>
        <ArticleCard
          article={{
            ...baseArticle,
            multimedia: { 
              caption: 'Test caption',
              credit: 'Test credit',
              default: { url: 'https://example.com/image.jpg' }
            } as any,
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('handles onClick error gracefully', async () => {
    const user = userEvent.setup();

    // Mock window.scrollY to be undefined
    Object.defineProperty(window, 'scrollY', {
      value: undefined,
      writable: true
    });

    render(
      <MemoryRouter>
        <ArticleCard article={baseArticle} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /headline one/i });

    // This should not throw an error
    await user.click(link);

    // Verify the link still works
    expect(link).toBeInTheDocument();
  });

  test('handles onClick when window.scrollY is null', async () => {
    const user = userEvent.setup();

    // Mock window.scrollY to be null
    Object.defineProperty(window, 'scrollY', {
      value: null,
      writable: true
    });

    render(
      <MemoryRouter>
        <ArticleCard article={baseArticle} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /headline one/i });

    // This should not throw an error
    await user.click(link);

    // Verify the link still works
    expect(link).toBeInTheDocument();
  });

  test('handles onClick when window.scrollY is 0', async () => {
    const user = userEvent.setup();

    // Mock window.scrollY to be 0
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true
    });

    render(
      <MemoryRouter>
        <ArticleCard article={baseArticle} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /headline one/i });

    // This should not throw an error
    await user.click(link);

    // Verify the link still works
    expect(link).toBeInTheDocument();
  });

  test('handles onClick when window.scrollY is a positive number', async () => {
    const user = userEvent.setup();

    // Mock window.scrollY to be a positive number
    Object.defineProperty(window, 'scrollY', {
      value: 150,
      writable: true
    });

    render(
      <MemoryRouter>
        <ArticleCard article={baseArticle} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /headline one/i });

    // This should not throw an error
    await user.click(link);

    // Verify the link still works
    expect(link).toBeInTheDocument();
  });

  test('handles article with missing optional fields', () => {
    const minimalArticle = {
      _id: 'minimal',
      web_url: 'https://example.com/minimal',
      snippet: 'Minimal article',
      headline: { main: 'Minimal Headline' },
      keywords: [],
      pub_date: '2024-01-01T00:00:00Z',
      multimedia: {},
    };

    render(
      <MemoryRouter>
        <ArticleCard article={minimalArticle as any} />
      </MemoryRouter>
    );

    expect(screen.getByText('Minimal Headline')).toBeInTheDocument();
    expect(screen.getByText('Minimal article')).toBeInTheDocument();
  });

  test('handles article with empty headline', () => {
    const articleWithEmptyHeadline = {
      ...baseArticle,
      headline: { main: '' },
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithEmptyHeadline} />
      </MemoryRouter>
    );

    // Should not crash when headline is empty
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  test('handles article with missing section_name', () => {
    const articleWithoutSection = {
      ...baseArticle,
      section_name: undefined,
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithoutSection} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when section_name is missing
  });

  test('handles article with missing byline', () => {
    const articleWithoutByline = {
      ...baseArticle,
      byline: undefined,
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithoutByline} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when byline is missing
  });

  test('handles article with empty byline', () => {
    const articleWithEmptyByline = {
      ...baseArticle,
      byline: { original: '' },
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithEmptyByline} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when byline is empty
  });

  test('handles article with missing pub_date', () => {
    const articleWithoutDate = {
      ...baseArticle,
      pub_date: undefined,
    } as any;

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithoutDate} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when pub_date is missing
  });

  test('handles article with invalid pub_date', () => {
    const articleWithInvalidDate = {
      ...baseArticle,
      pub_date: 'invalid-date',
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithInvalidDate} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when pub_date is invalid
  });

  test('handles article with missing keywords', () => {
    const articleWithoutKeywords = {
      ...baseArticle,
      keywords: undefined,
    } as any;

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithoutKeywords} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when keywords is missing
  });

  test('handles article with null keywords', () => {
    const articleWithNullKeywords = {
      ...baseArticle,
      keywords: null as any,
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithNullKeywords} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when keywords is null
  });

  test('handles article with empty keywords array', () => {
    const articleWithEmptyKeywords = {
      ...baseArticle,
      keywords: [],
    };

    render(
      <MemoryRouter>
        <ArticleCard article={articleWithEmptyKeywords} />
      </MemoryRouter>
    );

    expect(screen.getByText('Headline One')).toBeInTheDocument();
    // Should not crash when keywords is empty
  });
});
