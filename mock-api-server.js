const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// NYT API configuration
const NYT_API_KEY = process.env.NYT_API_KEY || 'ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7';
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
          type: 'image',
          subtype: 'photo',
          caption: article.media[0].caption || '',
          copyright: article.media[0].copyright || '',
          approved_for_syndication: article.media[0].approved_for_syndication || 1,
          'media-metadata': article.media[0]['media-metadata'] || []
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
      // Extract list and date from GraphQL query or variables
      let list = variables?.list || 'hardcover-fiction';
      let date = variables?.date || '';
      
      // If variables are not provided, try to extract from the query string
      if (!variables?.list) {
        const listMatch = query.match(/list:\s*["']([^"']+)["']/);
        if (listMatch) {
          list = listMatch[1];
        }
      }
      
      if (!variables?.date) {
        const dateMatch = query.match(/date:\s*["']([^"']+)["']/);
        if (dateMatch) {
          date = dateMatch[1];
        }
      }
      
      console.log('Full query:', query);
      console.log('Variables:', variables);
      console.log('List parameter:', list);
      console.log('Date parameter:', date);
      
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
          primary_isbn13: book.primary_isbn13,
          primary_isbn10: book.primary_isbn10,
          bookImageWidth: book.book_image_width || 0,
          bookImageHeight: book.book_image_height || 0,
          age_group: book.age_group || '',
          book_review_link: book.book_review_link || '',
          first_chapter_link: book.first_chapter_link || '',
          sunday_review_link: book.sunday_review_link || '',
          article_chapter_link: book.article_chapter_link || '',
          buy_links: book.buy_links || [],
          book_uri: book.book_uri || '',
          rank_last_week: book.rank_last_week || 0,
          weeks_on_list: book.weeks_on_list || 0,
          asterisk: book.asterisk || 0,
          dagger: book.dagger || 0,
          price: book.price || '',
          contributor: book.contributor || '',
          contributor_note: book.contributor_note || '',
          isbns: book.isbns || []
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
        
        // Different fallback data based on list type
        let fallbackBooks;
        
        if (list.includes('hardcover-fiction') || (list.includes('fiction') && !list.includes('nonfiction'))) {
          fallbackBooks = [
          {
            title: "The Midnight Library",
            author: "Matt Haig",
            description: "Between life and death there is a library, and within that library, the shelves go on forever.",
            publisher: "Canongate Books",
            rank: 1,
            weeks_on_list: 52,
            amazonProductUrl: "https://www.amazon.com/Midnight-Library-Matt-Haig/dp/0525559477",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
            primary_isbn13: "9780525559474",
            primary_isbn10: "0525559477",
            bookImageWidth: 150,
            bookImageHeight: 225,
            age_group: "",
            book_review_link: "",
            first_chapter_link: "",
            sunday_review_link: "",
            article_chapter_link: "",
            buy_links: [],
            book_uri: "",
            rank_last_week: 1,
            asterisk: 0,
            dagger: 0,
            price: "$24.00",
            contributor: "",
            contributor_note: "",
            isbns: []
          },
          {
            title: "Atomic Habits",
            author: "James Clear",
            description: "An easy and proven way to build good habits and break bad ones.",
            publisher: "Avery",
            rank: 2,
            weeks_on_list: 156,
            amazonProductUrl: "https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
            primary_isbn13: "9780735211292",
            primary_isbn10: "0735211299",
            bookImageWidth: 150,
            bookImageHeight: 225,
            age_group: "",
            book_review_link: "",
            first_chapter_link: "",
            sunday_review_link: "",
            article_chapter_link: "",
            buy_links: [],
            book_uri: "",
            rank_last_week: 2,
            asterisk: 0,
            dagger: 0,
            price: "$23.00",
            contributor: "",
            contributor_note: "",
            isbns: []
          },
          {
            title: "The Seven Husbands of Evelyn Hugo",
            author: "Taylor Jenkins Reid",
            description: "Aging and reclusive Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous and scandalous life.",
            publisher: "Atria Books",
            rank: 3,
            weeks_on_list: 89,
            amazonProductUrl: "https://www.amazon.com/Seven-Husbands-Evelyn-Hugo-Novel/dp/1501161938",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1674739973i/32620332.jpg",
            primary_isbn13: "9781501161939",
            primary_isbn10: "1501161938",
            bookImageWidth: 150,
            bookImageHeight: 225,
            age_group: "",
            book_review_link: "",
            first_chapter_link: "",
            sunday_review_link: "",
            article_chapter_link: "",
            buy_links: [],
            book_uri: "",
            rank_last_week: 3,
            asterisk: 0,
            dagger: 0,
            price: "$26.00",
            contributor: "",
            contributor_note: "",
            isbns: []
          },
          {
            title: "Lessons in Chemistry",
            author: "Bonnie Garmus",
            description: "A novel about a female scientist whose career is constantly derailed by the idea that a woman's place is in the home.",
            publisher: "Doubleday",
            rank: 4,
            weeks_on_list: 67,
            amazonProductUrl: "https://www.amazon.com/Lessons-Chemistry-Novel-Bonnie-Garmus/dp/038554734X",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1644158558i/58065033.jpg",
            primary_isbn13: "9780385547345",
            primary_isbn10: "038554734X",
            bookImageWidth: 150,
            bookImageHeight: 225,
            age_group: "",
            book_review_link: "",
            first_chapter_link: "",
            sunday_review_link: "",
            article_chapter_link: "",
            buy_links: [],
            book_uri: "",
            rank_last_week: 4,
            asterisk: 0,
            dagger: 0,
            price: "$28.00",
            contributor: "",
            contributor_note: "",
            isbns: []
          },
          {
            title: "Tomorrow, and Tomorrow, and Tomorrow",
            author: "Gabrielle Zevin",
            description: "A modern love story about two friends finding their way through life.",
            publisher: "Knopf",
            rank: 5,
            weeks_on_list: 45,
            amazonProductUrl: "https://www.amazon.com/Tomorrow-Novel-Gabrielle-Zevin/dp/0593321200",
            bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1634158558i/58784475.jpg",
            primary_isbn13: "9780593321201",
            primary_isbn10: "0593321200",
            bookImageWidth: 150,
            bookImageHeight: 225,
            age_group: "",
            book_review_link: "",
            first_chapter_link: "",
            sunday_review_link: "",
            article_chapter_link: "",
            buy_links: [],
            book_uri: "",
            rank_last_week: 5,
            asterisk: 0,
            dagger: 0,
            price: "$27.00",
            contributor: "",
            contributor_note: "",
            isbns: []
          }
        ];
        } else if (list.includes('nonfiction') || list.includes('paperback-nonfiction')) {
          fallbackBooks = [
            {
              title: "Sapiens: A Brief History of Humankind",
              author: "Yuval Noah Harari",
              description: "A groundbreaking narrative of humanity's creation and evolution.",
              publisher: "Harper",
              rank: 1,
              weeks_on_list: 89,
              amazonProductUrl: "https://www.amazon.com/Sapiens-Humankind-Yuval-Noah-Harari/dp/0062316095",
              bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1420595954i/23692271.jpg",
              primary_isbn13: "9780062316097",
              primary_isbn10: "0062316095",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 1,
              asterisk: 0,
              dagger: 0,
              price: "$29.99",
              contributor: "",
              contributor_note: "",
              isbns: []
            },
            {
              title: "The Power of Habit",
              author: "Charles Duhigg",
              description: "Why we do what we do in life and business.",
              publisher: "Random House",
              rank: 2,
              weeks_on_list: 67,
              amazonProductUrl: "https://www.amazon.com/Power-Habit-What-Life-Business/dp/081298160X",
              bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1545854312i/12609433.jpg",
              primary_isbn13: "9780812981605",
              primary_isbn10: "081298160X",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 2,
              asterisk: 0,
              dagger: 0,
              price: "$26.00",
              contributor: "",
              contributor_note: "",
              isbns: []
            },
            {
              title: "Thinking, Fast and Slow",
              author: "Daniel Kahneman",
              description: "The two systems that drive the way we think.",
              publisher: "Farrar, Straus and Giroux",
              rank: 3,
              weeks_on_list: 45,
              amazonProductUrl: "https://www.amazon.com/Thinking-Fast-Slow-Daniel-Kahneman/dp/0374533555",
              bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg",
              primary_isbn13: "9780374533557",
              primary_isbn10: "0374533555",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 3,
              asterisk: 0,
              dagger: 0,
              price: "$30.00",
              contributor: "",
              contributor_note: "",
              isbns: []
            }
          ];
        } else if (list.includes('graphic') || list.includes('manga')) {
          fallbackBooks = [
            {
              title: "Watchmen",
              author: "Alan Moore",
              description: "A groundbreaking graphic novel about superheroes and society.",
              publisher: "DC Comics",
              rank: 1,
              weeks_on_list: 23,
              amazonProductUrl: "https://www.amazon.com/Watchmen-Alan-Moore/dp/0930289234",
              bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1441249349i/472331.jpg",
              primary_isbn13: "9780930289232",
              primary_isbn10: "0930289234",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 1,
              asterisk: 0,
              dagger: 0,
              price: "$19.99",
              contributor: "",
              contributor_note: "",
              isbns: []
            },
            {
              title: "Maus",
              author: "Art Spiegelman",
              description: "A survivor's tale of the Holocaust.",
              publisher: "Pantheon",
              rank: 2,
              weeks_on_list: 34,
              amazonProductUrl: "https://www.amazon.com/Maus-Survivors-Tale-Art-Spiegelman/dp/0394747232",
              bookImage: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327872220i/15195.jpg",
              primary_isbn13: "9780394747231",
              primary_isbn10: "0394747232",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 2,
              asterisk: 0,
              dagger: 0,
              price: "$16.95",
              contributor: "",
              contributor_note: "",
              isbns: []
            }
          ];
        } else {
          // Default fallback for other categories
          fallbackBooks = [
            {
              title: "Sample Book",
              author: "Sample Author",
              description: "A sample book for this category.",
              publisher: "Sample Publisher",
              rank: 1,
              weeks_on_list: 1,
              amazonProductUrl: "https://www.amazon.com",
              bookImage: "https://via.placeholder.com/150x225?text=Book+Cover",
              primary_isbn13: "9780000000000",
              primary_isbn10: "0000000000",
              bookImageWidth: 150,
              bookImageHeight: 225,
              age_group: "",
              book_review_link: "",
              first_chapter_link: "",
              sunday_review_link: "",
              article_chapter_link: "",
              buy_links: [],
              book_uri: "",
              rank_last_week: 1,
              asterisk: 0,
              dagger: 0,
              price: "$19.99",
              contributor: "",
              contributor_note: "",
              isbns: []
            }
          ];
        }
        
        res.json({
          data: {
            bestsellers: {
              listName: list.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              displayName: list.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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
