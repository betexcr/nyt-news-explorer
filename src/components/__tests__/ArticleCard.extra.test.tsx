import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleCard from '../../components/ArticleCard';
import { useSearchStore } from '../../store/searchStore';

const baseArticle = {
  _id: 'id-1',
  web_url: 'https://example.com/one',
  snippet: 'Snippet one',
  headline: { main: 'Headline One' },
  pub_date: '2022-02-02T00:00:00Z',
  section_name: 'World',
  multimedia: {} as any,
};

beforeEach(() => {
  useSearchStore.getState().reset();
  (window as any).scrollY = 123;
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

test('uses provided multimedia.default.url when available', () => {
  render(
    <MemoryRouter>
      <ArticleCard
        article={{
          ...baseArticle,
          multimedia: { default: { url: 'https://cdn.example.com/pic.jpg' } } as any,
        }}
      />
    </MemoryRouter>
  );

  const img = screen.getByAltText('');
  expect(img).toHaveAttribute('src', 'https://cdn.example.com/pic.jpg');
});

test('click stores scrollY in search store and navigates with ?url=', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ArticleCard article={baseArticle} />
    </MemoryRouter>
  );

  const link = screen.getByRole('link', { name: /headline one/i });
  expect(link).toHaveAttribute('href', expect.stringContaining('/detail?'));
  expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(baseArticle.web_url)));

  await user.click(link);
  expect(useSearchStore.getState().scrollY).toBe(123);
});
