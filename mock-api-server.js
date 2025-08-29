const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// NYT API configuration
const NYT_API_KEY = process.env.NYT_API_KEY || 'test';
const NYT_BASE_URL = 'https://api.nytimes.com/svc';

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:50479', 'http://localhost:3000'],
  credentials: true
}));
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
      const section = (variables?.section || 'home').toLowerCase();
      
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
        byline: article.byline,
        multimedia: article.media?.[0] ? [{
          url: article.media[0]['media-metadata']?.[0]?.url || '',
          format: 'Standard Thumbnail',
          height: article.media[0]['media-metadata']?.[0]?.height || 75,
          width: article.media[0]['media-metadata']?.[0]?.width || 75,
          type: 'image',
          subtype: 'photo',
          caption: '',
          copyright: ''
        }] : []
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
      
      try {
        const response = await axios.get(`${NYT_BASE_URL}/books/v3/lists/${date}/${list}.json`, {
          params: {
            'api-key': NYT_API_KEY
          }
        });
        
        const books = response.data.results.books.map(book => ({
          title: book.title,
          author: book.author,
          description: book.description,
          publisher: book.publisher,
          rank: book.rank,
          weeksOnList: book.weeks_on_list,
          amazonProductUrl: book.amazon_product_url,
          bookImage: book.book_image,
          isbn13: book.primary_isbn13
        }));
        
        res.json({
          data: {
            bestsellers: {
              listName: response.data.results.list_name,
              displayName: response.data.results.display_name,
              updated: response.data.results.updated,
              books: books
            }
          }
        });
      } catch (error) {
        console.log('NYT Books API rate limited, using fallback data');
        
        // Fallback data when rate limited
        const fallbackBooks = [
          {
            title: "The Midnight Library",
            author: "Matt Haig",
            description: "Between life and death there is a library, and within that library, the shelves go on forever.",
            publisher: "Canongate Books",
            rank: 1,
            weeksOnList: 52,
            amazonProductUrl: "https://www.amazon.com/Midnight-Library-Matt-Haig/dp/0525559477",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
            isbn13: "9780525559474"
          },
          {
            title: "Atomic Habits",
            author: "James Clear",
            description: "An easy and proven way to build good habits and break bad ones.",
            publisher: "Avery",
            rank: 2,
            weeksOnList: 156,
            amazonProductUrl: "https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
            isbn13: "9780735211292"
          },
          {
            title: "The Seven Husbands of Evelyn Hugo",
            author: "Taylor Jenkins Reid",
            description: "Aging and reclusive Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous and scandalous life.",
            publisher: "Atria Books",
            rank: 3,
            weeksOnList: 89,
            amazonProductUrl: "https://www.amazon.com/Seven-Husbands-Evelyn-Hugo-Novel/dp/1501161938",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1674739973i/32620332.jpg",
            isbn13: "9781501161939"
          },
          {
            title: "Lessons in Chemistry",
            author: "Bonnie Garmus",
            description: "A novel about a female scientist whose career is constantly derailed by the idea that a woman's place is in the home.",
            publisher: "Doubleday",
            rank: 4,
            weeksOnList: 67,
            amazonProductUrl: "https://www.amazon.com/Lessons-Chemistry-Novel-Bonnie-Garmus/dp/038554734X",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1644158558i/58065033.jpg",
            isbn13: "9780385547345"
          },
          {
            title: "Tomorrow, and Tomorrow, and Tomorrow",
            author: "Gabrielle Zevin",
            description: "A modern love story about two friends finding their way through life.",
            publisher: "Knopf",
            rank: 5,
            weeksOnList: 45,
            amazonProductUrl: "https://www.amazon.com/Tomorrow-Novel-Gabrielle-Zevin/dp/0593321200",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1634158558i/58784475.jpg",
            isbn13: "9780593321201"
          }
        ];
        
        res.json({
          data: {
            bestsellers: {
              listName: "Hardcover Fiction",
              displayName: "Hardcover Fiction",
              updated: new Date().toISOString(),
              books: fallbackBooks
            }
          }
        });
      }
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
