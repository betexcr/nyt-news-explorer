const { ApolloServer, gql } = require('apollo-server-micro');
const axios = require('axios');

// GraphQL Schema
const typeDefs = gql`
  type Article {
    id: String!
    title: String!
    abstract: String
    url: String!
    byline: String
    published_date: String!
    section: String
    subsection: String
    media: [Media]
    des_facet: [String]
    org_facet: [String]
    per_facet: [String]
    geo_facet: [String]
  }

  type Media {
    type: String!
    subtype: String
    caption: String
    copyright: String
    approved_for_syndication: Int
    media_metadata: [MediaMetadata]
  }

  type MediaMetadata {
    url: String!
    format: String!
    height: Int!
    width: Int!
  }

  type Query {
    topStories(section: String): [Article]
    mostPopular: [Article]
    searchArticles(query: String!, page: Int = 0): [Article]
    articleById(id: String!): Article
  }
`;

// Resolvers
const resolvers = {
  Query: {
    topStories: async (_, { section = 'home' }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${apiKey}`
        );
        
        return response.data.results || [];
      } catch (error) {
        console.error('Error fetching top stories:', error);
        throw new Error('Failed to fetch top stories');
      }
    },

    mostPopular: async () => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/mostpopular/v2/viewed/1.json?api-key=${apiKey}`
        );
        
        return response.data.results || [];
      } catch (error) {
        console.error('Error fetching most popular:', error);
        throw new Error('Failed to fetch most popular articles');
      }
    },

    searchArticles: async (_, { query, page = 0 }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&page=${page}&api-key=${apiKey}`
        );
        
        return response.data.response?.docs || [];
      } catch (error) {
        console.error('Error searching articles:', error);
        throw new Error('Failed to search articles');
      }
    },

    articleById: async (_, { id }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/search/v2/articlesearch.json?fq=uri:("nyt://article/${id}")&api-key=${apiKey}`
        );
        
        return response.data.response?.docs?.[0] || null;
      } catch (error) {
        console.error('Error fetching article by ID:', error);
        throw new Error('Failed to fetch article');
      }
    }
  }
};

// Apollo Server setup for Vercel
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
});

const handler = server.createHandler({ path: '/api' });

module.exports = handler;
