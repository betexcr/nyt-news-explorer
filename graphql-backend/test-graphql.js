// Simple test to verify GraphQL schema is working
const { buildSchema } = require('graphql');

// Test schema compilation
const typeDefs = `
  type Article {
    id: String!
    title: String!
    abstract: String
    url: String!
    byline: String
    published_date: String!
    section: String
    subsection: String
  }

  type Query {
    topStories(section: String): [Article]
    mostPopular: [Article]
    searchArticles(query: String!, page: Int = 0): [Article]
    articleById(id: String!): Article
  }
`;

try {
  const schema = buildSchema(typeDefs);
  console.log('✅ GraphQL schema compiled successfully!');
  console.log('📋 Available queries:');
  console.log('  - topStories(section: String): [Article]');
  console.log('  - mostPopular: [Article]');
  console.log('  - searchArticles(query: String!, page: Int): [Article]');
  console.log('  - articleById(id: String!): Article');
} catch (error) {
  console.error('❌ GraphQL schema compilation failed:', error.message);
  process.exit(1);
}
