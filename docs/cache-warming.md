# Daily Cache Warming System

This document describes the automated daily cache warming system that pre-populates all caches to ensure optimal performance and cost savings.

## Overview

The cache warming system automatically fetches and caches popular content daily to provide instant loading for users. It runs at 6:00 AM UTC every day via Vercel Cron Jobs.

## Components

### 1. Daily Cache Warmer Script (`scripts/daily-cache-warmer.js`)

A standalone Node.js script that can be run locally or via cron jobs.

**Features:**
- Batch processing (5 requests at a time)
- Exponential backoff retry logic
- Comprehensive error handling and logging
- Detailed statistics and reporting

**Usage:**
```bash
# Run against production
npm run cache:warm

# Run against local development
npm run cache:warm:local

# Manual API call
npm run cache:warm:manual
```

### 2. Vercel Cron Job (`api/cron/daily-cache-warm.js`)

Automated daily execution via Vercel Cron Jobs.

**Schedule:** `0 6 * * *` (6:00 AM UTC daily)

**Configuration in `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-cache-warm",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### 3. Manual Cache Warming API (`/api/admin/warm-cache`)

RESTful endpoint for manual cache warming.

**Endpoint:** `POST /api/admin/warm-cache`

**Headers:**
```
Authorization: Bearer {ADMIN_API_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "targets": ["topStories", "mostPopular", "books", "archive", "search"]
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T06:00:00.000Z",
  "targets": {
    "topStories": ["home", "technology", "business", "sports"],
    "mostPopular": [1, 7, 30],
    "books": ["hardcover-fiction", "hardcover-nonfiction"]
  },
  "results": {
    "topStories": {
      "home": { "success": true, "cached": true },
      "technology": { "success": true, "cached": true }
    },
    "books": {
      "hardcover-fiction": { "success": true, "cached": true, "books": 15 }
    }
  }
}
```

## Warming Targets

### Top Stories (10 sections)
- `home`, `technology`, `business`, `sports`, `world`
- `politics`, `science`, `health`, `arts`, `opinion`

### Most Popular (3 periods)
- `1` day, `7` days, `30` days

### Books (10 categories)
- `hardcover-fiction`, `hardcover-nonfiction`
- `trade-fiction-paperback`, `paperback-nonfiction`
- `advice-how-to-and-miscellaneous`
- `childrens-middle-grade-hardcover`
- `picture-books`, `series-books`
- `young-adult-hardcover`
- `combined-print-and-e-book-fiction`

### Archive (4 recent months)
- `2024-01`, `2023-12`, `2023-11`, `2023-10`

### Search (5 popular queries)
- `technology`, `politics`, `business`, `sports`, `health`

## Cache Strategy

### TTL Configuration
- **Top Stories**: 30 minutes (1800s)
- **Most Popular**: 30 minutes (1800s)
- **Books**: 24 hours (86400s)
- **Archive**: 4 hours (14400s)
- **Search**: 20 minutes (1200s)

### Cache Headers
```http
Cache-Control: public, max-age=0, s-maxage={TTL}, stale-while-revalidate={TTL*2}
ETag: "{sha1-hash}"
Vary: Accept-Encoding, Accept-Language
X-Cache: HIT/MISS
```

### Cache Keys
- **Top Stories**: `BUILD_${BUILD_ID}:api:v1:articles:top-stories:${section}`
- **Most Popular**: `BUILD_${BUILD_ID}:api:v1:articles:most-popular:${period}`
- **Books**: `BUILD_${BUILD_ID}:books:best-sellers:${list}:${date}`
- **Archive**: `BUILD_${BUILD_ID}:api:v1:articles:archive:${year}:${month}`
- **Search**: `BUILD_${BUILD_ID}:api:v1:articles:search:${hash}`

## Monitoring

### Cache Health Monitor
Real-time monitoring dashboard accessible at `/cache-health`:

- **TanStack Query Cache**: Live statistics
- **Local Storage Cache**: Entry count and size
- **Offline Cache**: Queue status and cached items
- **Books Prefetch**: Success/failure rates and scheduling

### Manual Controls
- **Warm All Caches**: Trigger manual cache warming
- **Prefetch Books**: Trigger books-specific prefetching
- **Clear Cache**: Invalidate specific or all caches
- **Cleanup Expired**: Remove expired cache entries

### Logging
All cache operations are logged with:
- **Cache Status**: HIT/MISS/STALE/REVALIDATED
- **Response Time**: Request duration in milliseconds
- **Error Handling**: Detailed error messages and retry attempts

## Performance Impact

### Expected Results
- **95%+ cache hit ratio** for popular content
- **85-95% reduction** in NYT API calls
- **Instant loading** for warmed content
- **Massive cost savings** in API usage

### Cost Optimization
- **Redis Operations**: Fewer SETs, more GETs
- **Bandwidth**: Reduced data transfer through ETags
- **API Limits**: Minimal risk of hitting rate limits
- **Edge Caching**: Leverages Vercel's edge network

## Troubleshooting

### Common Issues

#### Cron Job Not Running
```bash
# Check Vercel deployment logs
vercel logs --follow

# Verify cron configuration
vercel env pull .env.local
```

#### Cache Warming Fails
```bash
# Check API key configuration
echo $NYT_API_KEY
echo $ADMIN_API_KEY

# Test manual warming
curl -X POST /api/admin/warm-cache \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"targets": ["topStories"]}'
```

#### Low Cache Hit Ratio
```bash
# Check cache statistics
curl /api/cache/health

# Verify TTL settings
# Check cache key generation
# Monitor Redis performance
```

### Debug Commands
```bash
# Run local cache warmer
npm run cache:warm:local

# Test specific endpoint
curl "https://nyt-news-explorer-nqtb4ofq3-albmunmus-projects.vercel.app/api/v1/articles/top-stories/home"

# Check cache headers
curl -I "https://nyt-news-explorer-nqtb4ofq3-albmunmus-projects.vercel.app/api/v1/books/best-sellers/hardcover-fiction"
```

## Security

### Authentication
- **Admin API Key**: Required for manual cache warming
- **Cron Secret**: Optional verification for cron jobs
- **Rate Limiting**: Built-in retry logic with backoff

### Best Practices
- **Environment Variables**: Secure API key storage
- **HTTPS Only**: All cache warming requests use HTTPS
- **Error Handling**: Graceful degradation on failures
- **Monitoring**: Comprehensive logging and alerting

## Future Enhancements

- [ ] **Smart Scheduling**: Adjust warming based on usage patterns
- [ ] **Predictive Prefetching**: ML-based content prediction
- [ ] **Regional Optimization**: Geo-specific cache warming
- [ ] **A/B Testing**: Compare warming strategies
- [ ] **Cost Analytics**: Detailed cost impact reporting
