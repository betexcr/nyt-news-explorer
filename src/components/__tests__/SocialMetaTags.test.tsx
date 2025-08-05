import React from 'react';
import { render } from '@testing-library/react';
import SocialMetaTags from '../SocialMetaTags';
import type { NytArticle } from '../../types/nyt';

// Mock react-helmet with a proper implementation
jest.mock('react-helmet', () => {
  const React = require('react');
  return {
    Helmet: ({ children }: { children: React.ReactNode }) => {
      return React.createElement('div', { 'data-testid': 'helmet' }, children);
    }
  };
});

const mockArticle: NytArticle = {
  _id: '1',
  web_url: 'https://www.nytimes.com/2024/01/01/test-article.html',
  snippet: 'This is a test article snippet for social media preview.',
  headline: { main: 'Test Article Headline' },
  keywords: [
    { name: 'Subject', value: 'Test Subject', rank: 1 },
    { name: 'Person', value: 'Test Person', rank: 2 }
  ],
  pub_date: '2024-01-01T00:00:00Z',
  multimedia: {
    default: {
      url: 'https://static01.nyt.com/images/2024/01/01/test-image.jpg',
      height: 400,
      width: 600
    }
  },
  section_name: 'Test Section',
};

describe('SocialMetaTags', () => {
  test('renders with default props', () => {
    const { getByTestId } = render(<SocialMetaTags />);
    expect(getByTestId('helmet')).toBeInTheDocument();
  });

  test('renders with article data', () => {
    const { getByTestId } = render(<SocialMetaTags article={mockArticle} />);
    expect(getByTestId('helmet')).toBeInTheDocument();
  });

  test('renders with custom props', () => {
    const customProps = {
      title: 'Custom Title',
      description: 'Custom description',
      image: 'https://example.com/custom-image.jpg',
      url: 'https://example.com/custom-url'
    };
    
    const { getByTestId } = render(<SocialMetaTags {...customProps} />);
    expect(getByTestId('helmet')).toBeInTheDocument();
  });

  test('renders with article and custom props', () => {
    const customProps = {
      title: 'Custom Title',
      description: 'Custom description',
      image: 'https://example.com/custom-image.jpg',
      url: 'https://example.com/custom-url',
      article: mockArticle
    };
    
    const { getByTestId } = render(<SocialMetaTags {...customProps} />);
    expect(getByTestId('helmet')).toBeInTheDocument();
  });
}); 