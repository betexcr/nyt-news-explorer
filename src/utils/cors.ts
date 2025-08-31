// CORS utility functions for handling cross-origin requests

import { API_CONFIG, isDevelopment } from '../config/api';

export interface CorsOptions {
  enableFallback?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Make an API request with CORS fallback handling
 */
export async function makeCorsRequest<T>(
  url: string,
  options: RequestInit = {},
  corsOptions: CorsOptions = {}
): Promise<T> {
  const {
    enableFallback = isDevelopment,
    retryAttempts = API_CONFIG.REQUEST.RETRY_ATTEMPTS,
    retryDelay = API_CONFIG.REQUEST.RETRY_DELAY_MS
  } = corsOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      // Try the primary URL first
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      lastError = error;
      
      // If it's a CORS error and we have fallback enabled, try the fallback URL
      if (enableFallback && 
          (error.message?.includes('CORS') || error.message?.includes('cross-origin'))) {
        
        console.warn(`CORS error on attempt ${attempt + 1}, trying fallback...`);
        
        try {
          const fallbackUrl = url.replace(API_CONFIG.NYT.BASE_URL, API_CONFIG.CORS.FALLBACK_URL);
          const fallbackResponse = await fetch(fallbackUrl, options);
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
          }
          
          return await fallbackResponse.json();
        } catch (fallbackError: any) {
          console.warn('Fallback request also failed:', fallbackError.message);
          lastError = fallbackError;
        }
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError || new Error('All request attempts failed');
}

/**
 * Check if CORS is supported in the current environment
 */
export function isCorsSupported(): boolean {
  return typeof window !== 'undefined' && 'fetch' in window;
}

/**
 * Get the appropriate API base URL for the current environment
 */
export function getApiBaseUrl(): string {
  return API_CONFIG.NYT.BASE_URL;
}

/**
 * Create a CORS-safe URL by checking the current environment
 */
export function createCorsSafeUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}
