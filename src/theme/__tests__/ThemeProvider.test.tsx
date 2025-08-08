import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

// Mock the theme utilities
jest.mock('../../utils/theme', () => ({
  getStoredTheme: jest.fn(),
  setTheme: jest.fn(),
  applyTheme: jest.fn(),
  systemPrefersDark: jest.fn(),
}));

const { getStoredTheme: _getStoredTheme, setTheme: _setTheme, applyTheme: _applyTheme, systemPrefersDark: _systemPrefersDark } = require('../../utils/theme');

const TestComponent = () => {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test('renders children', () => {
    // Mock localStorage before rendering
    const mockLocalStorage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });

    render(
      <ThemeProvider>
        <div>Test content</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('initializes with stored theme', () => {
    // Mock the internal getInitialTheme function by mocking localStorage
    const mockGetItem = jest.fn().mockReturnValue('dark');
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(mockGetItem).toHaveBeenCalledWith('app-theme');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  test('initializes with system preference when no stored theme', () => {
    // Mock localStorage to return null (no stored theme)
    const mockGetItem = jest.fn().mockReturnValue(null);
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock matchMedia to return dark preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(mockGetItem).toHaveBeenCalledWith('app-theme');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  test('toggles theme correctly', () => {
    // Mock localStorage to return light theme initially
    const mockGetItem = jest.fn().mockReturnValue('light');
    const mockSetItem = jest.fn();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: jest.fn(),
      },
      writable: true,
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByText('Toggle');
    
    act(() => {
      toggleButton.click();
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(mockSetItem).toHaveBeenCalledWith('app-theme', 'dark');
  });

  test('handles invalid stored theme', () => {
    // Mock localStorage to return invalid theme
    const mockGetItem = jest.fn().mockReturnValue('invalid-theme');
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock matchMedia to return light preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(mockGetItem).toHaveBeenCalledWith('app-theme');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });
});
