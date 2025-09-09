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
    mostPopular(period: String = "7"): [Article]
    searchArticles(query: String!, page: Int = 0, sort: String = "relevance", beginDate: String, endDate: String): [Article]
    articleById(id: String!): Article
    articleByUrl(url: String!): Article
    archive(year: Int!, month: Int!): [Article]
    bestsellers(list: String!, date: String = "current"): BookList
    listNames: [BookListName]
    movieReviews(type: String = "all"): [MovieReview]
  }

  type BookList {
    listName: String!
    displayName: String!
    updated: String
    books: [Book!]!
  }

  type Book {
    title: String!
    author: String!
    description: String
    publisher: String
    rank: Int
    weeksOnList: Int
    amazonProductUrl: String
    bookImage: String
    isbn13: [String!]!
  }

  type BookListName {
    listName: String!
    displayName: String!
    listNameEncoded: String!
    oldestPublishedDate: String
    newestPublishedDate: String
    updated: String
  }

  type MovieReview {
    displayTitle: String!
    mpaaRating: String
    criticsPick: Int
    byline: String
    headline: String
    summaryShort: String
    publicationDate: String
    openingDate: String
    dateUpdated: String
    link: MovieLink
    multimedia: MovieMultimedia
  }

  type MovieLink {
    type: String
    url: String
    suggestedLinkText: String
  }

  type MovieMultimedia {
    type: String
    src: String
    height: Int
    width: Int
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

    mostPopular: async (_, { period = "7" }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/mostpopular/v2/viewed/${period}.json?api-key=${apiKey}`
        );
        
        return response.data.results || [];
      } catch (error) {
        console.error('Error fetching most popular:', error);
        throw new Error('Failed to fetch most popular articles');
      }
    },

    searchArticles: async (_, { query, page = 0, sort = "relevance", beginDate, endDate }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        let url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&page=${page}&sort=${sort}&api-key=${apiKey}`;
        
        if (beginDate) url += `&begin_date=${beginDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const response = await axios.get(url);
        
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
    },

    articleByUrl: async (_, { url }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/search/v2/articlesearch.json?fq=web_url:("${encodeURIComponent(url)}")&api-key=${apiKey}`
        );
        
        return response.data.response?.docs?.[0] || null;
      } catch (error) {
        console.error('Error fetching article by URL:', error);
        throw new Error('Failed to fetch article');
      }
    },

    archive: async (_, { year, month }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/archive/v1/${year}/${month}.json?api-key=${apiKey}`
        );
        
        return response.data.response?.docs || [];
      } catch (error) {
        console.error('Error fetching archive:', error);
        throw new Error('Failed to fetch archive');
      }
    },

    bestsellers: async (_, { list, date = "current" }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/books/v3/lists/${date}/${encodeURIComponent(list)}.json?api-key=${apiKey}`
        );
        
        const result = response.data.results;
        return {
          listName: result?.list_name || list,
          displayName: result?.display_name || list,
          updated: result?.updated || null,
          books: (result?.books || []).map(book => ({
            title: book.title,
            author: book.author,
            description: book.description,
            publisher: book.publisher,
            rank: book.rank,
            weeksOnList: book.weeks_on_list,
            amazonProductUrl: book.amazon_product_url,
            bookImage: book.book_image,
            isbn13: (book.isbns || []).map(isbn => isbn.isbn13).filter(Boolean)
          }))
        };
      } catch (error) {
        console.error('Error fetching bestsellers:', error);
        throw new Error('Failed to fetch bestsellers');
      }
    },

    listNames: async () => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/books/v3/lists/names.json?api-key=${apiKey}`
        );
        
        return (response.data.results || []).map(list => ({
          listName: list.list_name,
          displayName: list.display_name,
          listNameEncoded: list.list_name_encoded,
          oldestPublishedDate: list.oldest_published_date,
          newestPublishedDate: list.newest_published_date,
          updated: list.updated
        }));
      } catch (error) {
        console.error('Error fetching list names:', error);
        throw new Error('Failed to fetch list names');
      }
    },

    movieReviews: async (_, { type = "all" }) => {
      try {
        const apiKey = process.env.NYT_API_KEY;
        if (!apiKey) {
          throw new Error('NYT API key not configured');
        }
        
        const response = await axios.get(
          `https://api.nytimes.com/svc/movies/v2/reviews/${type}.json?api-key=${apiKey}`
        );
        
        return (response.data.results || []).map(review => ({
          displayTitle: review.display_title,
          mpaaRating: review.mpaa_rating,
          criticsPick: review.critics_pick,
          byline: review.byline,
          headline: review.headline,
          summaryShort: review.summary_short,
          publicationDate: review.publication_date,
          openingDate: review.opening_date,
          dateUpdated: review.date_updated,
          link: review.link ? {
            type: review.link.type,
            url: review.link.url,
            suggestedLinkText: review.link.suggested_link_text
          } : null,
          multimedia: review.multimedia ? {
            type: review.multimedia.type,
            src: review.multimedia.src,
            height: review.multimedia.height,
            width: review.multimedia.width
          } : null
        }));
      } catch (error) {
        console.error('Error fetching movie reviews:', error);
        throw new Error('Failed to fetch movie reviews');
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

// Apollo Server v3 requires an explicit start() before createHandler()
const serverStartPromise = server.start();

// Export a request handler compatible with Vercel's Node runtime
module.exports = async (req, res) => {
  // Basic CORS to allow browser Playground and cross-origin calls
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Fast-path for CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  await serverStartPromise;
  const handler = server.createHandler({ path: '/api' });
  return handler(req, res);
};
