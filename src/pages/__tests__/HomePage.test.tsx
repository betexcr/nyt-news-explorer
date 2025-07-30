import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '../HomePage';
import { MemoryRouter } from 'react-router-dom';

test('links to search', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
  const link = screen.getByRole('link', { name: /go to search/i });
  expect(link).toBeInTheDocument();
  expect(link.getAttribute('href')).toBe('/search');
});
