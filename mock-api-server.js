const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock GraphQL endpoint
app.post('/api/v1/graphql', (req, res) => {
  const { query, variables } = req.body;
  
  console.log('GraphQL Query:', query);
  console.log('Variables:', variables);
  
  // Mock responses based on query
  if (query.includes('searchArticles')) {
    res.json({
      data: {
        searchArticles: {
          articles: [
            {
              id: '1',
              url: 'https://www.nytimes.com/test1',
              title: 'Test Article 1',
              abstract: 'This is a test article',
              snippet: 'Test snippet',
              leadParagraph: 'Test lead paragraph',
              source: 'The New York Times',
              publishedDate: '2024-01-01T00:00:00Z',
              author: 'Test Author',
              section: 'test',
              subsection: 'test',
              multimedia: [],
              keywords: [],
              headline: { main: 'Test Article 1' },
              byline: { original: 'Test Author', person: [] }
            }
          ],
          meta: {
            hits: 1,
            offset: 0,
            time: 100
          }
        }
      }
    });
  } else if (query.includes('topStories')) {
    res.json({
      data: {
        topStories: [
          {
            id: '2',
            url: 'https://www.nytimes.com/test2',
            title: 'Top Story 1',
            abstract: 'This is a top story',
            publishedDate: '2024-01-01T00:00:00Z',
            author: 'Test Author',
            section: 'home',
            subsection: 'test',
            multimedia: [],
            keywords: [],
            headline: { main: 'Top Story 1' },
            byline: { original: 'Test Author', person: [] }
          }
        ]
      }
    });
  } else if (query.includes('mostPopular')) {
    res.json({
      data: {
        mostPopular: [
          {
            id: '3',
            url: 'https://www.nytimes.com/test3',
            title: 'Popular Article 1',
            abstract: 'This is a popular article',
            publishedDate: '2024-01-01T00:00:00Z',
            section: 'test',
            byline: 'Test Author'
          }
        ]
      }
    });
  } else if (query.includes('archive')) {
    res.json({
      data: {
        archive: [
          {
            id: '4',
            url: 'https://www.nytimes.com/test4',
            title: 'Archive Article 1',
            abstract: 'This is an archive article',
            publishedDate: '2024-01-01T00:00:00Z',
            author: 'Test Author',
            section: 'test',
            subsection: 'test',
            multimedia: [],
            keywords: [],
            headline: { main: 'Archive Article 1' },
            byline: { original: 'Test Author', person: [] }
          }
        ]
      }
    });
  } else if (query.includes('bestsellers')) {
    res.json({
      data: {
        bestsellers: {
          listName: 'test-list',
          displayName: 'Test List',
          updated: '2024-01-01',
          books: [
            {
              title: 'Test Book',
              author: 'Test Author',
              description: 'Test description',
              publisher: 'Test Publisher',
              rank: 1,
              weeksOnList: 1,
              amazonProductUrl: 'https://amazon.com/test',
              bookImage: 'https://test.com/image.jpg',
              isbn13: ['1234567890123']
            }
          ]
        }
      }
    });
  } else {
    res.json({
      data: {
        __typename: 'Query'
      }
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Mock API Server Running' });
});

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
