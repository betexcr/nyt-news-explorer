import { getStoredTheme, setTheme, applyTheme, initTheme } from '../theme';

describe('theme utilities', () => {
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

  describe('getStoredTheme', () => {
    test('returns stored theme when available', () => {
      const mockGetItem = jest.fn().mockReturnValue('dark');
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      expect(getStoredTheme()).toBe('dark');
      expect(mockGetItem).toHaveBeenCalledWith('theme');
    });

    test('returns null when no theme is stored', () => {
      const mockGetItem = jest.fn().mockReturnValue(null);
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      expect(getStoredTheme()).toBeNull();
    });

    test('returns null when localStorage is undefined', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      expect(getStoredTheme()).toBeNull();
    });

    test('returns null when stored theme is invalid', () => {
      const mockGetItem = jest.fn().mockReturnValue('invalid-theme');
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      expect(getStoredTheme()).toBeNull();
    });
  });

  describe('setTheme', () => {
    test('stores theme in localStorage', () => {
      const mockSetItem = jest.fn();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: mockSetItem,
          removeItem: jest.fn(),
        },
        writable: true,
      });

      setTheme('dark');

      expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark');
    });

    test('handles localStorage being undefined', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      // Should not throw an error
      expect(() => setTheme('dark')).not.toThrow();
    });
  });

  describe('applyTheme', () => {
    test('applies theme to document', () => {
      const mockSetAttribute = jest.fn();
      const originalDocument = global.document;
      // Create a proper document mock that passes the typeof check
      const mockDocument = {
        documentElement: {
          setAttribute: mockSetAttribute,
        },
      };
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
      });

      applyTheme('dark');

      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');

      global.document = originalDocument;
    });

    test('handles document being undefined', () => {
      const originalDocument = global.document;
      // @ts-ignore - intentionally setting to undefined for test
      global.document = undefined;

      // Should not throw an error
      expect(() => applyTheme('dark')).not.toThrow();

      global.document = originalDocument;
    });
  });

  describe('initTheme', () => {
    test('initializes theme', () => {
      const mockGetItem = jest.fn().mockReturnValue('dark');
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const mockSetAttribute = jest.fn();
      const originalDocument = global.document;
      // Create a proper document mock that passes the typeof check
      const mockDocument = {
        documentElement: {
          setAttribute: mockSetAttribute,
        },
      };
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
      });

      initTheme();

      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');

      global.document = originalDocument;
    });
  });
});
