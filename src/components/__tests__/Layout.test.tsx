import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout';
import { MemoryRouter } from 'react-router-dom';

test('renders header and children', () => {
  render(
    <MemoryRouter>
      <Layout><div>Child</div></Layout>
    </MemoryRouter>
  );
  expect(screen.getByText(/NYT News Explorer/i)).toBeInTheDocument();
  expect(screen.getByText('Child')).toBeInTheDocument();
});
