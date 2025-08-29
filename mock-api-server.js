const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// NYT API configuration
const NYT_API_KEY = process.env.NYT_API_KEY || 'test';
const NYT_BASE_URL = 'https://api.nytimes.com/svc';

app.use(cors());
app.use(express.json());

// Mock GraphQL endpoint
app.post('/api/v1/graphql', async (req, res) => {
  const { query, variables } = req.body;
  
  console.log('GraphQL Query:', query);
  console.log('Variables:', variables);
  console.log('Using NYT API Key:', NYT_API_KEY);
  
  try {
    // Handle different GraphQL queries by calling real NYT API
    if (query.includes('searchArticles')) {
      const searchQuery = variables?.query || 'technology';
      const page = variables?.page || 0;
      
      const response = await axios.get(`${NYT_BASE_URL}/search/v2/articlesearch.json`, {
        params: {
          'api-key': NYT_API_KEY,
          q: searchQuery,
          page: page
        }
      });
      
             const articles = response.data.response.docs.map(doc => ({
         id: doc._id,
         url: doc.web_url,
         title: doc.headline?.main || doc.snippet,
         abstract: doc.abstract,
         snippet: doc.snippet,
         leadParagraph: doc.lead_paragraph,
         source: doc.source,
         publishedDate: doc.pub_date,
         author: doc.byline?.original,
         section: doc.section_name,
         subsection: doc.subsection_name,
         multimedia: doc.multimedia || [],
         keywords: doc.keywords || [],
         headline: { main: doc.headline?.main || doc.snippet },
         byline: { original: doc.byline?.original || '', person: [] }
       }));
       
       res.json({
         data: {
           searchArticles: {
             articles,
             meta: {
               hits: response.data.response.metadata.hits,
               offset: response.data.response.metadata.offset,
               time: response.data.response.metadata.time
             }
           }
         }
       });
    } else if (query.includes('topStories')) {
      const section = variables?.section || 'home';
      
      const response = await axios.get(`${NYT_BASE_URL}/topstories/v2/${section}.json`, {
        params: {
          'api-key': NYT_API_KEY
        }
      });
      
      const articles = response.data.results.map(article => ({
        id: article.uri,
        url: article.url,
        title: article.title,
        abstract: article.abstract,
        publishedDate: article.published_date,
        author: article.byline,
        section: article.section,
        subsection: article.subsection,
        multimedia: article.multimedia || [],
        keywords: article.des_facet || [],
        headline: { main: article.title },
        byline: { original: article.byline, person: [] }
      }));
      
      res.json({
        data: {
          topStories: articles
        }
      });
    } else if (query.includes('mostPopular')) {
      const period = variables?.period || 7;
      
      const response = await axios.get(`${NYT_BASE_URL}/mostpopular/v2/viewed/${period}.json`, {
        params: {
          'api-key': NYT_API_KEY
        }
      });
      
      const articles = response.data.results.map(article => ({
        id: article.id,
        url: article.url,
        title: article.title,
        abstract: article.abstract,
        publishedDate: article.published_date,
        section: article.section,
        byline: article.byline
      }));
      
      res.json({
        data: {
          mostPopular: articles
        }
      });
    } else if (query.includes('archive')) {
      const year = variables?.year || 2024;
      const month = variables?.month || 1;
      
      const response = await axios.get(`${NYT_BASE_URL}/archive/v1/${year}/${month}.json`, {
        params: {
          'api-key': NYT_API_KEY
        }
      });
      
      const articles = response.data.response.docs.map(doc => ({
        id: doc._id,
        url: doc.web_url,
        title: doc.headline?.main || doc.snippet,
        abstract: doc.abstract,
        publishedDate: doc.pub_date,
        author: doc.byline?.original,
        section: doc.section_name,
        subsection: doc.subsection_name,
        multimedia: doc.multimedia || [],
        keywords: doc.keywords || [],
        headline: { main: doc.headline?.main || doc.snippet },
        byline: { original: doc.byline?.original || '', person: [] }
      }));
      
      res.json({
        data: {
          archive: articles
        }
      });
    } else if (query.includes('bestsellers')) {
      const list = variables?.list || 'hardcover-fiction';
      const date = variables?.date || '';
      
      const response = await axios.get(`${NYT_BASE_URL}/books/v3/lists/${date}/${list}.json`, {
        params: {
          'api-key': NYT_API_KEY
        }
      });
      
      const books = response.data.results.books.map(book => ({
        id: book.primary_isbn13,
        title: book.title,
        author: book.author,
        description: book.description,
        publisher: book.publisher,
        rank: book.rank,
        weeksOnList: book.weeks_on_list,
        isbn13: book.primary_isbn13,
        isbn10: book.primary_isbn10,
        coverImage: book.book_image,
        buyLinks: book.buy_links || []
      }));
      
      res.json({
        data: {
          bestsellers: books
        }
      });
    } else {
      res.json({
        data: {
          __typename: 'Query'
        }
      });
    }
  } catch (error) {
    console.error('NYT API Error:', error.response?.data || error.message);
    res.status(500).json({
      errors: [{
        message: 'Failed to fetch data from NYT API',
        extensions: {
          code: 'NYT_API_ERROR'
        }
      }]
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Mock API Server Running' });
});

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
