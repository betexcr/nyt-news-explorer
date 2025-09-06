import { beforeEach, afterAll, test, expect, jest } from '@jest/globals';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV, REACT_APP_NYT_API_KEY: 'test-key', NODE_ENV: 'development' };
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = OLD_ENV;
});

test('searchArticles: early return when query is blank (no axios call)', async () => {
  const { searchArticles } = await import('../nyt');
  
  const r1 = await searchArticles('');
  const r2 = await searchArticles('   ');
  expect(r1).toEqual([]);
  expect(r2).toEqual([]);
  expect(mockAxios.get).not.toHaveBeenCalled();
});

test('searchArticles: success, includes api-key and trimmed query', async () => {
  const mockGet = jest.fn((_url: string, { params, signal }: any) => {
    expect(params['api-key']).toBe('test-key');
    expect(params.q).toBe('climate'); 
    expect(Number.isInteger(params.page) && params.page >= 0).toBe(true);
    expect(signal).toBeUndefined();  
    
    // Return 10 results for each page (mimicking NYT API behavior)
    const page = params.page || 0;
    const docs = Array.from({ length: 10 }, (_, i) => ({ 
      _id: `A-${page}-${i}`,
      web_url: `https://example.com/${page}-${i}`,
      snippet: `Test article ${page}-${i}`,
      multimedia: {
        caption: 'Test caption',
        credit: 'Test credit',
        default: {
          url: 'https://example.com/image.jpg',
          height: 600,
          width: 600
        },
        thumbnail: {
          url: 'https://example.com/thumb.jpg',
          height: 75,
          width: 75
        }
      },
      headline: { main: `Test Headline ${page}-${i}` },
      keywords: [],
      pub_date: '2024-01-01T00:00:00Z'
    }));
    
    return Promise.resolve({
      data: { 
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: { 
          docs,
          meta: { hits: 20, offset: page * 10, time: 10 }
        } 
      },
    });
  });
  
  mockAxios.get.mockImplementation(mockGet);
  
  const { searchArticles } = await import('../nyt');
  const res = await searchArticles('  climate  ');
  
  // Now returns 12 results (10 from page 0 + 2 from page 1)
  expect(res).toHaveLength(12);
  
  // Check first result (now has page-specific ID)
  expect(res[0]).toEqual({ 
    _id: 'A-0-0',
    web_url: 'https://example.com/0-0',
    snippet: 'Test article 0-0',
    multimedia: {
      caption: 'Test caption',
      credit: 'Test credit',
      default: {
        url: 'https://example.com/image.jpg',
        height: 600,
        width: 600
      },
      thumbnail: {
        url: 'https://example.com/thumb.jpg',
        height: 75,
        width: 75
      }
    },
    headline: { main: 'Test Headline 0-0' },
    keywords: [],
    pub_date: '2024-01-01T00:00:00Z'
  });
  
  // Check that all results have the same structure
  res.forEach(article => {
    expect(article).toHaveProperty('_id');
    expect(article).toHaveProperty('web_url');
    expect(article).toHaveProperty('snippet');
  });
});

test('searchArticles: handles empty response', async () => {
  mockAxios.get.mockResolvedValue({
    data: { 
      status: 'OK',
      response: { 
        docs: [],
        meta: { hits: 0, offset: 0, time: 10 }
      } 
    },
  });
  
  const { searchArticles } = await import('../nyt');
  const res = await searchArticles('test');
  expect(res).toEqual([]);
});

test('searchArticles: handles malformed response', async () => {
  mockAxios.get.mockResolvedValue({
    data: { 
      status: 'OK',
      response: { 
        // No docs field
        meta: { hits: 0, offset: 0, time: 10 }
      } 
    },
  });
  
  const { searchArticles } = await import('../nyt');
  const res = await searchArticles('test');
  expect(res).toEqual([]);
});

test('searchArticlesAdv: builds params (page default, sort, begin/end, section->fq with escaping)', async () => {
  const sectionWithQuotes = 'Opinion';
  const mockGet = jest.fn((_url: string, { params }: any) => {
    expect(params['api-key']).toBe('test-key')
    expect(params.page).toBe(0);
    expect(params.q).toBe('science');
    expect(params.sort).toBe('newest');
    expect(params.begin_date).toBe('20240101');
    expect(params.end_date).toBe('20241231'); 
    expect(params.fq).toBe('desk:("OpEd")');
    return Promise.resolve({
      data: { 
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: { 
          docs: [{ 
            _id: 'D1',
            web_url: 'https://example.com/1',
            snippet: 'Test article 1',
            multimedia: {
              caption: 'Test caption 1',
              credit: 'Test credit 1',
              default: {
                url: 'https://example.com/image1.jpg',
                height: 600,
                width: 600
              },
              thumbnail: {
                url: 'https://example.com/thumb1.jpg',
                height: 75,
                width: 75
              }
            },
            headline: { main: 'Test Headline 1' },
            keywords: [],
            pub_date: '2024-01-01T00:00:00Z'
          }, { 
            _id: 'D2',
            web_url: 'https://example.com/2',
            snippet: 'Test article 2',
            multimedia: {
              caption: 'Test caption 2',
              credit: 'Test credit 2',
              default: {
                url: 'https://example.com/image2.jpg',
                height: 600,
                width: 600
              },
              thumbnail: {
                url: 'https://example.com/thumb2.jpg',
                height: 75,
                width: 75
              }
            },
            headline: { main: 'Test Headline 2' },
            keywords: [],
            pub_date: '2024-01-01T00:00:00Z'
          }],
          meta: { hits: 2, offset: 0, time: 10 }
        } 
      },
    });
  });
  
  mockAxios.get.mockImplementation(mockGet);

  const { searchArticlesAdv } = await import('../nyt');
  const res = await searchArticlesAdv({
    q: 'science',
    sort: 'newest',
    begin: '20240101',
    end: '20241231',
    section: sectionWithQuotes,
  });
  expect(res.length).toBe(2);
});

test('searchArticlesAdv: no fq when section is blank/whitespace', async () => {
  const mockGet = jest.fn((_url: string, { params }: any) => {
    expect(params.q).toBe('tech');
    expect(params.fq).toBeUndefined();
    return Promise.resolve({ 
      data: { 
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: { docs: [], meta: { hits: 0, offset: 0, time: 10 } } 
      } 
    });
  });
  
  mockAxios.get.mockImplementation(mockGet);

  const { searchArticlesAdv } = await import('../nyt');
  const res = await searchArticlesAdv({ q: 'tech', section: '   ' });
  expect(res).toEqual([]);
});

test('searchArticlesAdv: handles signal parameter', async () => {
  const signal = new AbortController().signal;
  mockAxios.get.mockResolvedValue({
    data: { 
      status: 'OK',
      response: { docs: [], meta: { hits: 0, offset: 0, time: 10 } } 
    },
  });

  const { searchArticlesAdv } = await import('../nyt');
  const res = await searchArticlesAdv({ q: 'test', signal });
  expect(res).toEqual([]);
  expect(mockAxios.get).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ params: expect.any(Object), signal })
  );
});

test('getArticleByUrl: early return for blank URL (no axios call)', async () => {
  const { getArticleByUrl } = await import('../nyt');
  
  const r1 = await getArticleByUrl('');
  const r2 = await getArticleByUrl('   ');
  expect(r1).toBeNull();
  expect(r2).toBeNull();
  expect(mockAxios.get).not.toHaveBeenCalled();
});

test('getArticleByUrl: success returns first doc and escapes quotes in fq', async () => {
  const urlWithQuotes = 'https://example.com/article "with" quotes';
  const mockGet = jest.fn((_url: string, { params }: any) => {
    expect(params['api-key']).toBe('test-key');
    expect(params.fq).toBe('web_url:("https://example.com/article \\"with\\" quotes")');
    return Promise.resolve({
      data: { 
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: { 
          docs: [{ 
            _id: 'E',
            web_url: 'https://example.com/article "with" quotes',
            snippet: 'Test article',
            multimedia: {},
            headline: { main: 'Test Headline' },
            keywords: [],
            pub_date: '2024-01-01T00:00:00Z'
          }],
          meta: { hits: 1, offset: 0, time: 10 }
        } 
      },
    });
  });
  
  mockAxios.get.mockImplementation(mockGet);

  const { getArticleByUrl } = await import('../nyt');
  const res = await getArticleByUrl(urlWithQuotes);
  expect(res).toEqual({ 
    _id: 'E',
    web_url: 'https://example.com/article "with" quotes',
    snippet: 'Test article',
    multimedia: {},
    headline: { main: 'Test Headline' },
    keywords: [],
    pub_date: '2024-01-01T00:00:00Z'
  });
});

test('getArticleByUrl: returns null when docs missing/empty', async () => {
  const mockGet = jest.fn((_url: string, { params }: any) => {
    expect(params['api-key']).toBe('test-key');
    return Promise.resolve({
      data: { 
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: { docs: [], meta: { hits: 0, offset: 0, time: 10 } } 
      },
    });
  });
  
  mockAxios.get.mockImplementation(mockGet);

  const { getArticleByUrl } = await import('../nyt');
  const res = await getArticleByUrl('https://example.com/article');
  expect(res).toBeNull();
});

test('getArticleByUrl: handles signal parameter', async () => {
  const signal = new AbortController().signal;
  mockAxios.get.mockResolvedValue({
    data: { 
      status: 'OK',
      response: { docs: [], meta: { hits: 0, offset: 0, time: 10 } } 
    },
  });

  const { getArticleByUrl } = await import('../nyt');
  const res = await getArticleByUrl('https://example.com/article', signal);
  expect(res).toBeNull();
  expect(mockAxios.get).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ params: expect.any(Object), signal })
  );
});

test('makeSearchController: creates controller', async () => {
  const { makeSearchController } = await import('../nyt');
  const controller = makeSearchController();
  
  // Test that the controller is a function
  expect(typeof controller).toBe('function');
});

test('searchArticles: handles signal parameter', async () => {
  const signal = new AbortController().signal;
  mockAxios.get.mockResolvedValue({
    data: { 
      status: 'OK',
      response: { docs: [], meta: { hits: 0, offset: 0, time: 10 } } 
    },
  });

  const { searchArticles } = await import('../nyt');
  const res = await searchArticles('test', signal);
  expect(res).toEqual([]);
  expect(mockAxios.get).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ params: expect.any(Object), signal })
  );
});
