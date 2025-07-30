import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// 1) Mock axios (avoid importing ESM from node_modules in Jest)
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    create: () => ({ get: jest.fn() })
  }
}));

// 2) Import the real module and spy on the export we need
import * as api from '../../api/nyt';

// Deterministic article returned by fallback loader
const mockArticle = {
  _id: 'a1',
  web_url: 'https://example.com/a1',
  snippet: 's1',
  lead_paragraph: 'l1',
  multimedia: [],
  headline: { main: 'Loaded by URL' },
  pub_date: '2024-01-01T00:00:00Z',
  section_name: 'World',
  byline: { original: 'By Test' },
};

beforeEach(() => {
  jest.spyOn(api, 'getArticleByUrl' as any).mockResolvedValue(mockArticle as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

import DetailPage from '../DetailPage';

test('renders and loads fallback by URL', async () => {
  render(
    <MemoryRouter initialEntries={['/detail?url=https://example.com/x']}>
      <Routes>
        <Route path="/detail" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
);
  const h = await screen.findByRole('heading', { name: /loaded by url/i });
  expect(h).toBeInTheDocument();
});
