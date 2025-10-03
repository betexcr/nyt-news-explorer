import { useErrorStore } from '../store/errorStore';

/**
 * Utility functions for reporting errors to the global error catcher
 */

export const reportError = (error: Error | string, source: 'api' | 'network' | 'javascript' | 'react' = 'javascript') => {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'object' && error.stack ? error.stack : undefined;
  
  useErrorStore.getState().addError({
    message,
    stack,
    type: 'error',
    source,
  });
};

export const reportWarning = (message: string, source: 'api' | 'network' | 'javascript' | 'react' = 'javascript') => {
  useErrorStore.getState().addError({
    message,
    type: 'warning',
    source,
  });
};

export const reportInfo = (message: string, source: 'api' | 'network' | 'javascript' | 'react' = 'javascript') => {
  useErrorStore.getState().addError({
    message,
    type: 'info',
    source,
  });
};

export const reportApiError = (error: any, endpoint: string) => {
  const message = error?.response?.data?.message || error?.message || 'API request failed';
  const status = error?.response?.status;
  
  useErrorStore.getState().addError({
    message: `API Error (${endpoint}): ${message}${status ? ` (${status})` : ''}`,
    stack: error?.stack,
    type: 'error',
    source: 'api',
  });
};

export const reportNetworkError = (error: any, url: string) => {
  const message = error?.message || 'Network request failed';
  
  useErrorStore.getState().addError({
    message: `Network Error (${url}): ${message}`,
    stack: error?.stack,
    type: 'error',
    source: 'network',
  });
};

// Hook for easy access in components
export const useErrorReporter = () => {
  return {
    reportError,
    reportWarning,
    reportInfo,
    reportApiError,
    reportNetworkError,
  };
};
