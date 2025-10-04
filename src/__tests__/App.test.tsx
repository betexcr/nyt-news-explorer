import React from 'react';
import { render } from '@testing-library/react';

// Mock swagger-ui-react before importing App
jest.mock('swagger-ui-react', () => {
  return function MockSwaggerUI({ spec }: { spec: any }) {
    return <div data-testid="swagger-ui">Mock SwaggerUI with spec: {JSON.stringify(spec)}</div>;
  };
});

import App from '../App';

test('renders App without crashing', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeTruthy();
});
