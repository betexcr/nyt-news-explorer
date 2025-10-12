import { Request, Response } from 'express';
import { cacheGet, cacheSet, ckey, stableHash, tagAttach } from '../lib/redis';
import { makeETag, etagMatches } from '../lib/etag';
import { logCacheOperation } from '../middleware/cacheLog';

// Cache TTL configurations
const CACHE_TTL = {
  SEARCH: 120, // 2 minutes for search results
  TOP_STORIES: 300, // 5 minutes for top stories
  ARCHIVE: 3600, // 1 hour for archive data
  DETAIL: 300, // 5 minutes for article details
};

/**
 * Enhanced articles search endpoint with Redis caching
 */
export async function getCachedArticles(req: Request, res: Response) {
  const startTime = Date.now();
  const searchParams = req.query;
  
  // Create deterministic cache key
  const paramsHash = stableHash(searchParams);
  const cacheKey = ckey(['api', 'v1', 'articles', 'search', paramsHash]);
  
  try {
    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const etag = makeETag(JSON.stringify(cached));
      
      // Check If-None-Match header for conditional requests
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etagMatches(ifNoneMatch as string, etag)) {
        logCacheOperation('/api/articles', cacheKey, 'HIT', startTime);
        return res.status(304).header('ETag', etag).send();
      }
      
      // Return cached data with headers
      logCacheOperation('/api/articles', cacheKey, 'HIT', startTime);
      return res
        .header('ETag', etag)
        .header('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate')
        .header('Vary', 'Accept-Encoding, Accept-Language')
        .header('X-Cache-Status', 'HIT')
        .json(cached);
    }
    
    // Cache miss - fetch from NYT API
    const nytApiKey = process.env.REACT_APP_NYT_API_KEY;
    if (!nytApiKey) {
      return res.status(500).json({ error: 'NYT API key not configured' });
    }
    
    const nytUrl = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json');
    nytUrl.searchParams.set('api-key', nytApiKey);
    
    // Add search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) nytUrl.searchParams.set(key, value as string);
    });
    
    const response = await fetch(nytUrl.toString(), {
      headers: {
        'User-Agent': 'NYT-News-Explorer/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await cacheSet(cacheKey, data, CACHE_TTL.SEARCH);
    
    // Attach cache tags for invalidation
    await tagAttach('tag:articles', cacheKey);
    
    // Generate ETag
    const etag = makeETag(JSON.stringify(data));
    
    logCacheOperation('/api/articles', cacheKey, 'MISS', startTime);
    
    return res
      .header('ETag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('X-Cache-Status', 'MISS')
      .json(data);
    
  } catch (error) {
    console.error('Articles API error:', error);
    logCacheOperation('/api/articles', cacheKey, 'MISS', startTime);
    
    return res.status(503).json({ error: 'Failed to fetch articles' });
  }
}

/**
 * Enhanced top stories endpoint with Redis caching
 */
export async function getCachedTopStories(req: Request, res: Response) {
  const startTime = Date.now();
  const { section } = req.params;
  
  // Create cache key
  const cacheKey = ckey(['api', 'v1', 'top-stories', section]);
  
  try {
    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const etag = makeETag(JSON.stringify(cached));
      
      // Check If-None-Match header
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etagMatches(ifNoneMatch as string, etag)) {
        logCacheOperation('/api/top-stories', cacheKey, 'HIT', startTime);
        return res.status(304).header('ETag', etag).send();
      }
      
      logCacheOperation('/api/top-stories', cacheKey, 'HIT', startTime);
      return res
        .header('ETag', etag)
        .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
        .header('Vary', 'Accept-Encoding, Accept-Language')
        .header('X-Cache-Status', 'HIT')
        .json(cached);
    }
    
    // Cache miss - fetch from NYT API
    const nytApiKey = process.env.REACT_APP_NYT_API_KEY;
    if (!nytApiKey) {
      return res.status(500).json({ error: 'NYT API key not configured' });
    }
    
    const nytUrl = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${nytApiKey}`;
    
    const response = await fetch(nytUrl, {
      headers: {
        'User-Agent': 'NYT-News-Explorer/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await cacheSet(cacheKey, data, CACHE_TTL.TOP_STORIES);
    
    // Attach cache tags
    await tagAttach('tag:top-stories', cacheKey);
    await tagAttach(`tag:section:${section}`, cacheKey);
    
    // Generate ETag
    const etag = makeETag(JSON.stringify(data));
    
    logCacheOperation('/api/top-stories', cacheKey, 'MISS', startTime);
    
    return res
      .header('ETag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('X-Cache-Status', 'MISS')
      .json(data);
    
  } catch (error) {
    console.error('Top stories API error:', error);
    logCacheOperation('/api/top-stories', cacheKey, 'MISS', startTime);
    
    return res.status(503).json({ error: 'Failed to fetch top stories' });
  }
}

/**
 * Enhanced article detail endpoint with Redis caching
 */
export async function getCachedArticleDetail(req: Request, res: Response) {
  const startTime = Date.now();
  const { id } = req.params;
  
  // Create cache key
  const cacheKey = ckey(['api', 'v1', 'article', id]);
  
  try {
    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const etag = makeETag(JSON.stringify(cached));
      
      // Check If-None-Match header
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etagMatches(ifNoneMatch as string, etag)) {
        logCacheOperation('/api/article', cacheKey, 'HIT', startTime);
        return res.status(304).header('ETag', etag).send();
      }
      
      logCacheOperation('/api/article', cacheKey, 'HIT', startTime);
      return res
        .header('ETag', etag)
        .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
        .header('Vary', 'Accept-Encoding, Accept-Language')
        .header('X-Cache-Status', 'HIT')
        .json(cached);
    }
    
    // Cache miss - fetch from NYT API
    const nytApiKey = process.env.REACT_APP_NYT_API_KEY;
    if (!nytApiKey) {
      return res.status(500).json({ error: 'NYT API key not configured' });
    }
    
    // Search for the article by ID or URL
    const nytUrl = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json');
    nytUrl.searchParams.set('api-key', nytApiKey);
    nytUrl.searchParams.set('fq', `web_url:("${id}")`);
    nytUrl.searchParams.set('fl', 'web_url,headline,abstract,byline,multimedia,pub_date,section_name,subsection_name');
    
    const response = await fetch(nytUrl.toString(), {
      headers: {
        'User-Agent': 'NYT-News-Explorer/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`NYT API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the article from the response
    const article = data.response?.docs?.[0];
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Cache the article
    await cacheSet(cacheKey, article, CACHE_TTL.DETAIL);
    
    // Attach cache tags
    await tagAttach('tag:articles', cacheKey);
    await tagAttach(`tag:article:${id}`, cacheKey);
    if (article.section_name) {
      await tagAttach(`tag:section:${article.section_name}`, cacheKey);
    }
    
    // Generate ETag
    const etag = makeETag(JSON.stringify(article));
    
    logCacheOperation('/api/article', cacheKey, 'MISS', startTime);
    
    return res
      .header('ETag', etag)
      .header('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate')
      .header('Vary', 'Accept-Encoding, Accept-Language')
      .header('X-Cache-Status', 'MISS')
      .json(article);
    
  } catch (error) {
    console.error('Article API error:', error);
    logCacheOperation('/api/article', cacheKey, 'MISS', startTime);
    
    return res.status(503).json({ error: 'Failed to fetch article' });
  }
}
