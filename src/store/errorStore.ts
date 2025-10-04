import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ErrorItem {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
  source: 'javascript' | 'api' | 'react' | 'network';
  url?: string;
  line?: number;
  column?: number;
  componentStack?: string;
}

interface ErrorStore {
  errors: ErrorItem[];
  isVisible: boolean;
  maxErrors: number;
  
  // Actions
  addError: (error: Omit<ErrorItem, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  toggleVisibility: () => void;
  setVisibility: (visible: boolean) => void;
  setMaxErrors: (max: number) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useErrorStore = create<ErrorStore>()(
  devtools(
    (set, get) => ({
      errors: [],
      isVisible: false,
      maxErrors: 50,

      addError: (errorData) => {
        const newError: ErrorItem = {
          ...errorData,
          id: generateId(),
          timestamp: new Date(),
        };

        set((state) => {
          const newErrors = [newError, ...state.errors].slice(0, state.maxErrors);
          return { errors: newErrors };
        });

        // Auto-show error panel when new errors are added
        set({ isVisible: true });

        // Log to console for debugging (use original console.error to avoid infinite loop)
        if (typeof window !== 'undefined' && (window as any).__originalConsoleError) {
          (window as any).__originalConsoleError('[ERROR CATCHER]', newError);
        }
      },

      removeError: (id) => {
        set((state) => ({
          errors: state.errors.filter((error) => error.id !== id),
        }));
      },

      clearErrors: () => {
        set({ errors: [] });
      },

      toggleVisibility: () => {
        set((state) => ({ isVisible: !state.isVisible }));
      },

      setVisibility: (visible) => {
        set({ isVisible: visible });
      },

      setMaxErrors: (max) => {
        set({ maxErrors: max });
      },
    }),
    {
      name: 'error-store',
    }
  )
);

// Global error handlers - initialize immediately
let globalErrorHandlersInitialized = false;

export const initializeGlobalErrorHandlers = () => {
  if (globalErrorHandlersInitialized || typeof window === 'undefined') {
    return;
  }

  globalErrorHandlersInitialized = true;

  // JavaScript errors
  window.addEventListener('error', (event) => {
    useErrorStore.getState().addError({
      message: event.message,
      stack: event.error?.stack,
      type: 'error',
      source: 'javascript',
      url: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    useErrorStore.getState().addError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      type: 'error',
      source: 'javascript',
    });
  });

  // Console errors (override console.error)
  const originalConsoleError = console.error;
  (window as any).__originalConsoleError = originalConsoleError; // Store reference to avoid infinite loop
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    useErrorStore.getState().addError({
      message,
      type: 'error',
      source: 'javascript',
    });
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Console warnings (override console.warn)
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    useErrorStore.getState().addError({
      message,
      type: 'warning',
      source: 'javascript',
    });
    
    // Call original console.warn
    originalConsoleWarn.apply(console, args);
  };

  // Network errors (fetch)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (!response.ok) {
        useErrorStore.getState().addError({
          message: `HTTP ${response.status}: ${response.statusText} - ${args[0]}`,
          type: 'error',
          source: 'network',
        });
      }
      return response;
    } catch (error) {
      useErrorStore.getState().addError({
        message: `Network Error: ${error instanceof Error ? error.message : String(error)} - ${args[0]}`,
        stack: error instanceof Error ? error.stack : undefined,
        type: 'error',
        source: 'network',
      });
      throw error;
    }
  };

  console.log('[ERROR CATCHER] Global error handlers initialized');
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeGlobalErrorHandlers();
}
