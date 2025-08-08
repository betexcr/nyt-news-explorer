import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';

function Consumer() {
  const { theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('dark')}>dark</button>
    </div>
  );
}

describe('ThemeProvider behavior', () => {
  const origMatch = window.matchMedia;
  const origSetItem = Storage.prototype.setItem;
  let _setItemSpy: jest.SpyInstance;

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear(); 
    window.matchMedia = (query: string) => ({
      media: query,
      matches: false,
      onchange: null,
      addListener: () => {},  
      removeListener: () => {},  
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as any);
    _setItemSpy = jest.spyOn(Storage.prototype, 'setItem'); 
  });

  afterEach(() => {
    window.matchMedia = origMatch;
    Storage.prototype.setItem = origSetItem as any;
    jest.restoreAllMocks();
  });

  test('bootstraps theme from localStorage and writes to DOM/localStorage', async () => {
    const user = userEvent.setup();
    
    // Mock localStorage to return 'dark' for 'app-theme'
    const mockLocalStorage = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === 'app-theme') return 'dark';
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );
 
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
 
    await user.click(screen.getByText('light'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith('app-theme', 'light');
 
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('bootstraps from matchMedia when no stored value', () => {
 
    window.matchMedia = () =>
      ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as any);

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('useTheme outside provider throws', () => { 
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Outside = () => {
      try { 
        useTheme();
      } catch {
        return <div data-testid="error">error</div>;
      }
      return null;
    };

    render(<Outside />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    spy.mockRestore();
  });
});
