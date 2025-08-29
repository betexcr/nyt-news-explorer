// Re-export all functions from the GraphQL client
export * from './graphql-client';

// Re-export types from the original NYT APIs
export type { 
  MostPopularArticle, 
  TopStory, 
  Book, 
  ArchiveArticle 
} from '../types/nyt.other';

// This file serves as the main API interface for the frontend
// All components should import from this file instead of the old nyt-apis.ts or nyt.ts
