import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DayLikeTodayWidget from '../../components/DayLikeTodayWidget';

jest.mock('../../api/graphql-client', () => ({
  fetchArchiveByDay: jest.fn(async () => [])
}));

describe('DayLikeTodayWidget', () => {
  test('renders heading and empty state without errors', async () => {
    render(
      <MemoryRouter>
        <DayLikeTodayWidget />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /a day like today/i })).toBeInTheDocument();
    });
  });
});


