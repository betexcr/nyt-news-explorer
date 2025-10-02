import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryDefaults } from '../lib/queryClient';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: queryDefaults,
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
