import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteHeader } from '../SiteHeader';

test('renders SiteHeader', () => {
  const { container } = render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>
  );
  expect(container.firstChild).toBeTruthy();
});
