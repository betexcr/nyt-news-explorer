// API Configuration
export const API_CONFIG = {
  // NYT API Configuration
  NYT: {
    BASE_URL: process.env.NODE_ENV === 'development' 
      ? "/svc" 
      : "https://api.nytimes.com/svc",
    API_KEY: process.env.REACT_APP_NYT_API_KEY || "",
    ENDPOINTS: {
      ARTICLE_SEARCH: "/search/v2/articlesearch.json",
      MOST_POPULAR: "/mostpopular/v2",
      TOP_STORIES: "/topstories/v2",
      MOVIE_REVIEWS: "/movies/v2/reviews",
      BOOKS: "/books/v3",
      ARCHIVE: "/archive/v1",
      SEMANTIC: "/semantic/v2",
    }
  },
  
  // CORS Configuration
  CORS: {
    ENABLE_FALLBACK: process.env.NODE_ENV === 'development',
    FALLBACK_URL: "https://api.nytimes.com/svc",
    PROXY_URL: process.env.REACT_APP_CORS_PROXY || "",
  },
  
  // Request Configuration
  REQUEST: {
    TIMEOUT_MS: 10000,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY_MS: 1000,
  }
};

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.NYT.BASE_URL}${endpoint}`;
}

// Helper function to get fallback API URL
export function getFallbackApiUrl(endpoint: string): string {
  return `${API_CONFIG.CORS.FALLBACK_URL}${endpoint}`;
}

// Check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';
