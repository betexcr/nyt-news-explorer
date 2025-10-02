import { QueryClient } from '@tanstack/react-query';

/**
 * Default configuration for TanStack Query
 * Optimized for caching and performance
 */
export const queryDefaults = {
  queries: {
    // Data is considered fresh for 1 minute
    staleTime: 60_000,
    
    // Keep unused data in cache for 5 minutes
    gcTime: 300_000,
    
    // Don't refetch on window focus to reduce unnecessary requests
    refetchOnWindowFocus: false,
    
    // Only retry once on failure
    retry: 1,
    
    // Don't refetch on reconnect by default
    refetchOnReconnect: false,
    
    // Don't refetch on mount if data exists
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
  },
};

/**
 * Create a new QueryClient instance with default configuration
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryDefaults,
  });
}

/**
 * Default QueryClient instance
 */
export const queryClient = createQueryClient();
