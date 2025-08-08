import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArchivePage from '../../pages/ArchivePage';

jest.mock('../../api/nyt-apis', () => ({
  getArchive: jest.fn(async () => [
    {
      abstract: 'Historic event summary',
      web_url: 'https://www.nytimes.com/1900/01/01/example.html',
      snippet: 'Snippet text',
      lead_paragraph: 'Lead paragraph',
      print_page: 1,
      blog: [],
      source: 'The New York Times',
      multimedia: [{ url: '/logo.png' }],
      headline: { main: 'A headline', kicker: '', content_kicker: '', print_headline: '', name: '', seo: '', sub: '' },
      keywords: [],
      pub_date: '1900-01-01T00:00:00Z',
      document_type: 'article',
      news_desk: 'News',
      section_name: 'Archive',
      subsection_name: '',
      byline: { original: 'By NYT', person: [], organization: null },
      type_of_material: 'News',
      _id: 'nyt://article/1900-01-01-0001',
      word_count: 100,
      score: 1,
      uri: 'nyt://article/1900-01-01-0001',
    },
  ]),
}));

describe('ArchivePage', () => {
  beforeAll(() => {
    (global as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    process.env.REACT_APP_NYT_API_KEY = 'test';
  });

  test('renders header and loads articles', async () => {
    render(
      <MemoryRouter>
        <ArchivePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/NYT Archive Explorer/i)).toBeInTheDocument();
    // After UI change, Year is controlled by a slider with accessible name "Year"
    expect(screen.getByRole('slider', { name: /Year/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /Month/i })).toBeInTheDocument();

    // Wait for either data or an empty-state/rendered grid without throwing
    await waitFor(() => {
      expect(screen.getByText(/NYT Archive Explorer/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse decades of history/i)).toBeInTheDocument();
    });
  });
});


