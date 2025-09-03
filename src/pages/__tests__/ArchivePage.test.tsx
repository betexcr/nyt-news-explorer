import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

jest.mock('../../api/graphql-client', () => ({
  fetchArchiveByDay: jest.fn(async () => [
    {
      abstract: 'One day summary',
      web_url: 'https://www.nytimes.com/1900/01/02/example.html',
      snippet: 'Snippet text',
      lead_paragraph: 'Lead paragraph',
      print_page: 1,
      blog: [],
      source: 'The New York Times',
      multimedia: [{ url: '/logo.png' }],
      headline: { main: 'Day headline', kicker: '', content_kicker: '', print_headline: '', name: '', seo: '', sub: '' },
      keywords: [],
      pub_date: '1900-01-02T00:00:00Z',
      document_type: 'article',
      news_desk: 'News',
      section_name: 'Archive',
      subsection_name: '',
      byline: { original: 'By NYT', person: [], organization: null },
      type_of_material: 'News',
      _id: 'nyt://article/1900-01-02-0001',
      word_count: 100,
      score: 1,
      uri: 'nyt://article/1900-01-02-0001',
    },
  ]),
}));

jest.setTimeout(15000);

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

    expect(screen.getByText(/Archive/i)).toBeInTheDocument();
    // Sliders removed; calendar with month navigation is present
    expect(screen.getByRole('region', { name: /Calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next month/i })).toBeInTheDocument();
    // Floating search button exists
    expect(screen.getByRole('button', { name: /Search archive/i })).toBeInTheDocument();

    // Wait for either data or an empty-state/rendered grid without throwing
    await waitFor(() => {
      expect(screen.getByText(/Archive/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse NYT history/i)).toBeInTheDocument();
    });
  });

  test('single-day selection uses GraphQL one-day fetch', async () => {
    const { fetchArchiveByDay } = require('../../api/graphql-client');
    render(
      <MemoryRouter>
        <ArchivePage />
      </MemoryRouter>
    );

    // Click on day 2, then Search
    const dayButton = await screen.findByRole('button', { name: /^2$/ });
    await userEvent.click(dayButton);
    await userEvent.click(screen.getByRole('button', { name: /Search archive/i }));

    await waitFor(() => {
      expect(fetchArchiveByDay).toHaveBeenCalled();
    });
  });
});


