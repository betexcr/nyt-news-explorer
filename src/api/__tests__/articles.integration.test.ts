import { getCachedArticles } from '../cached-articles';

// Mock Redis functions
jest.mock('../../lib/redis', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  ckey: jest.fn((parts) => `BUILD_test:${parts.join(':')}`),
  stableHash: jest.fn((obj) => JSON.stringify(obj)),
  tagAttach: jest.fn(),
}));

// Mock ETag functions
jest.mock('../../lib/etag', () => ({
  makeETag: jest.fn((content) => `"${Buffer.from(content).toString('hex').slice(0, 8)}"`),
  extractETag: jest.fn((header) => header),
  etagMatches: jest.fn((a, b) => a === b),
}));

// Mock cache logging
jest.mock('../../middleware/cacheLog', () => ({
  logCacheOperation: jest.fn(),
  createCacheHeaders: jest.fn(() => ({ 'X-Cache-Status': 'HIT' })),
}));

import { cacheGet, cacheSet, tagAttach } from '../../lib/redis';
import { makeETag, etagMatches } from '../../lib/etag';
import { logCacheOperation } from '../../middleware/cacheLog';

describe('Cached Articles API Integration', () => {
  const mockCacheGet = cacheGet as jest.MockedFunction<typeof cacheGet>;
  const mockCacheSet = cacheSet as jest.MockedFunction<typeof cacheSet>;
  const mockTagAttach = tagAttach as jest.MockedFunction<typeof tagAttach>;
  const mockMakeETag = makeETag as jest.MockedFunction<typeof makeETag>;
  const mockEtagMatches = etagMatches as jest.MockedFunction<typeof etagMatches>;
  const mockLogCacheOperation = logCacheOperation as jest.MockedFunction<typeof logCacheOperation>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_NYT_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.REACT_APP_NYT_API_KEY;
  });

  describe('Cache HIT scenario', () => {
    it('should return cached data with proper headers', async () => {
      const cachedData = { status: 'OK', response: { docs: [] } };
      const etag = '"abc123"';
      
      mockCacheGet.mockResolvedValue(cachedData);
      mockMakeETag.mockReturnValue(etag);
      mockEtagMatches.mockReturnValue(false);

      const req = {
        query: { q: 'test' },
        headers: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.header).toHaveBeenCalledWith('ETag', etag);
      expect(res.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate');
      expect(res.header).toHaveBeenCalledWith('X-Cache-Status', 'HIT');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(mockLogCacheOperation).toHaveBeenCalledWith(
        '/api/articles',
        expect.any(String),
        'HIT',
        expect.any(Number)
      );
    });

    it('should return 304 for matching If-None-Match header', async () => {
      const cachedData = { status: 'OK', response: { docs: [] } };
      const etag = '"abc123"';
      
      mockCacheGet.mockResolvedValue(cachedData);
      mockMakeETag.mockReturnValue(etag);
      mockEtagMatches.mockReturnValue(true);

      const req = {
        query: { q: 'test' },
        headers: { 'if-none-match': etag },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.header).toHaveBeenCalledWith('ETag', etag);
      expect(res.send).toHaveBeenCalled();
      expect(mockLogCacheOperation).toHaveBeenCalledWith(
        '/api/articles',
        expect.any(String),
        'HIT',
        expect.any(Number)
      );
    });
  });

  describe('Cache MISS scenario', () => {
    it('should fetch from NYT API and cache response', async () => {
      const nytResponse = { status: 'OK', response: { docs: [{ id: 1, title: 'Test' }] } };
      
      mockCacheGet.mockResolvedValue(null); // Cache miss
      mockMakeETag.mockReturnValue('"def456"');
      
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(nytResponse),
      });

      const req = {
        query: { q: 'test' },
        headers: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.header).toHaveBeenCalledWith('ETag', '"def456"');
      expect(res.header).toHaveBeenCalledWith('X-Cache-Status', 'MISS');
      expect(res.json).toHaveBeenCalledWith(nytResponse);
      
      // Verify cache was set
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        nytResponse,
        120 // TTL
      );
      
      // Verify tags were attached
      expect(mockTagAttach).toHaveBeenCalledWith(
        'tag:articles',
        expect.any(String)
      );
      
      expect(mockLogCacheOperation).toHaveBeenCalledWith(
        '/api/articles',
        expect.any(String),
        'MISS',
        expect.any(Number)
      );
    });

    it('should handle NYT API errors gracefully', async () => {
      mockCacheGet.mockResolvedValue(null); // Cache miss
      
      // Mock fetch to return error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const req = {
        query: { q: 'test' },
        headers: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch articles' });
      expect(mockLogCacheOperation).toHaveBeenCalledWith(
        '/api/articles',
        expect.any(String),
        'MISS',
        expect.any(Number)
      );
    });

    it('should handle missing API key', async () => {
      delete process.env.REACT_APP_NYT_API_KEY;
      
      mockCacheGet.mockResolvedValue(null); // Cache miss

      const req = {
        query: { q: 'test' },
        headers: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'NYT API key not configured' });
    });
  });

  describe('Response headers', () => {
    it('should set proper cache control headers', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockMakeETag.mockReturnValue('"test"');
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'OK' }),
      });

      const req = {
        query: { q: 'test' },
        headers: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      } as any;

      await getCachedArticles(req, res);

      expect(res.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate');
      expect(res.header).toHaveBeenCalledWith('Vary', 'Accept-Encoding, Accept-Language');
    });
  });
});