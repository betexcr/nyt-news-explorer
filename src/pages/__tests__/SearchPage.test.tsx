import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
 
jest.mock('../../api/nyt', () => ({
  makeSearchController: () => async (q: string) => {
    return q ? [
      { _id: 'a1', web_url: 'https://example.com/a1', snippet: 's1', lead_paragraph: 'l1', multimedia: [], headline: { main: 'H1' }, pub_date: '2024-01-01T00:00:00Z', section_name: 'World' },
      { _id: 'a2', web_url: 'https://example.com/a2', snippet: 's2', lead_paragraph: 'l2', multimedia: [], headline: { main: 'H2' }, pub_date: '2024-01-02T00:00:00Z', section_name: 'US' }
    ] : [];
  }
}));

import SearchPage from '../SearchPage';

test('form submit renders results (bypasses debounce)', async () => {
  render(<MemoryRouter><SearchPage /></MemoryRouter>);

  const input = screen.getByRole('textbox', { name: /search input/i });
  await userEvent.clear(input);
  await userEvent.type(input, 'climate');

  const btn = screen.getByRole('button', { name: /search/i });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByText('H2')).toBeInTheDocument();
  });
});
