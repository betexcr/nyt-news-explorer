import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock swagger-ui-react before importing SwaggerUI
jest.mock('swagger-ui-react', () => {
  return function MockSwaggerUI({ spec }: { spec: any }) {
    return <div data-testid="swagger-ui">Mock SwaggerUI with spec: {JSON.stringify(spec)}</div>;
  };
});

import SwaggerUIComponent from '../SwaggerUI';

// Mock fetch
global.fetch = jest.fn();

describe('SwaggerUIComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<SwaggerUIComponent />);
    expect(screen.getByText('Loading API documentation...')).toBeInTheDocument();
  });

  test('renders error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<SwaggerUIComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load API specification')).toBeInTheDocument();
    });
  });

  test('renders SwaggerUI when spec loads successfully', async () => {
    const mockSpec = { openapi: '3.0.0', info: { title: 'Test API' } };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockSpec))
    });
    
    render(<SwaggerUIComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('swagger-ui')).toBeInTheDocument();
    });
  });

  test('applies className prop', () => {
    const { container } = render(<SwaggerUIComponent className="test-class" />);
    const loadingElement = screen.getByText('Loading API documentation...');
    
    // Debug: log the DOM structure
    console.log('Container HTML:', container.innerHTML);
    console.log('Loading element parent:', loadingElement.parentElement?.className);
    
    // Find the element with the className
    const elementWithClass = container.querySelector('.test-class');
    expect(elementWithClass).toBeInTheDocument();
  });
}); 