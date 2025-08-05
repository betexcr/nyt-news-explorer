import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteHeader } from '../SiteHeader';

// Mock ThemeToggle component
jest.mock('../ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

describe('SiteHeader', () => {
  test('renders SiteHeader with logo and navigation', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    expect(screen.getByText('NYT News Explorer')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  test('renders hamburger menu button on mobile', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    // The hamburger button should be present
    const mobileMenuBtn = screen.getByRole('button', { name: '' });
    expect(mobileMenuBtn).toBeInTheDocument();
  });

  test('renders options dropdown button', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Options')).toBeInTheDocument();
  });

  test('has correct CSS classes and styling', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '1000'
    });
  });

  test('renders navigation links with correct hrefs', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const homeLink = screen.getByText('Home').closest('a');
    const favoritesLink = screen.getByText('Favorites').closest('a');
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(favoritesLink).toHaveAttribute('href', '/favorites');
  });

  test('renders logo with correct link', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const logoLink = screen.getByText('NYT News Explorer').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  test('renders "by You" text', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    expect(screen.getByText('by You')).toBeInTheDocument();
  });

  test('has desktop navigation with correct classes', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const desktopNav = container.querySelector('.desktop-nav');
    expect(desktopNav).toBeInTheDocument();
  });

  test('has mobile menu button with correct classes', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const mobileMenuBtn = container.querySelector('.mobile-menu-btn');
    expect(mobileMenuBtn).toBeInTheDocument();
  });

  test('renders options dropdown with correct structure', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const optionsButton = screen.getByText('Options');
    expect(optionsButton).toBeInTheDocument();
    
    // Check for the dropdown arrow
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  test('header has correct container structure', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );
    
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    
    const innerDiv = header?.querySelector('div');
    expect(innerDiv).toHaveStyle({
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    });
  });
});
