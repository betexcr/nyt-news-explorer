# Caching Doctrine v1.0

This document outlines the comprehensive caching strategy implemented in the NYT News Explorer application.

## Overview

The caching system implements a multi-layered approach with:
- **Redis** for server-side caching with deterministic keys and tag-based invalidation
- **ETags** for conditional requests and HTTP caching
- **Service Worker** for client-side caching with different strategies per content type
- **TanStack Query** for client-side data management with intelligent background updates

## Architecture

### Cache Layers

1. **Server-side Redis Cache**
   - Stores API responses and computed data
   - Uses deterministic keys with BUILD_ID prefixes
   - Implements tag-based invalidation for surgical cache clearing

2. **HTTP Cache Headers**
   - Public endpoints use edge-cacheable headers
   - Private endpoints use no-cache headers
   - ETags for conditional requests (304 responses)

3. **Service Worker Cache**
   - HTML: NetworkFirst with 3s timeout
   - API: StaleWhileRevalidate for background updates
   - Assets: CacheFirst with 1-year expiration
   - Images: CacheFirst with 1-day expiration

4. **Client-side Query Cache**
   - TanStack Query manages data freshness
   - Background refetching for stale data
   - Optimistic updates for mutations

## Cache Keys

### Key Format
```
BUILD_${BUILD_ID}:type:version:scope:paramsHash
```

### Examples
- `BUILD_20240101:api:v1:articles:search:a1b2c3d4`
- `BUILD_20240101:api:v1:top-stories:technology:e5f6g7h8`
- `BUILD_20240101:api:v1:article:12345:i9j0k1l2`

### Key Components
- **BUILD_ID**: Deployment identifier for cache invalidation
- **type**: Cache category (api, ref, frag, auth)
- **version**: API version (v1, v2, etc.)
- **scope**: Specific endpoint or resource
- **paramsHash**: Deterministic hash of parameters

## Cache TTLs

| Endpoint Type | TTL | Stale-While-Revalidate | Reasoning |
|---------------|-----|------------------------|-----------|
| Search Results | 120s | 600s | Frequently changing content |
| Top Stories | 300s | 600s | Updates every 15 minutes |
| Article Details | 300s | 600s | Stable content |
| Archive Data | 3600s | 7200s | Historical data changes rarely |
| Reference Data | 3600s | 7200s | i18n, configuration data |
| JWKS | 21600s | N/A | Security keys, respect provider TTL |

## Cache Headers

### Public Endpoints (Edge Cacheable)
```http
Cache-Control: public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate
ETag: "abc123def456"
Vary: Accept-Encoding, Accept-Language
```

### Private Endpoints (User-Specific)
```http
Cache-Control: private, max-age=0, no-cache
```

### Static Assets (Hashed URLs)
```http
Cache-Control: public, max-age=31536000, immutable
```

## Tag-Based Invalidation

### Tag Structure
- `tag:articles` - All article-related caches
- `tag:top-stories` - All top stories caches
- `tag:section:technology` - Technology section caches
- `tag:article:12345` - Specific article caches

### Invalidation Examples

#### Purge All Articles
```bash
curl -X POST /api/admin/purge \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tag": "tag:articles"}'
```

#### Purge Specific Section
```bash
curl -X POST /api/admin/purge \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tag": "tag:section:technology"}'
```

#### Purge Script
```bash
bun tsx scripts/purgeTag.ts tag:articles
```

## Service Worker Strategy

### Request Routing
```javascript
if (url.pathname.startsWith('/api/')) {
  // StaleWhileRevalidate - serve cache immediately, update in background
  handleStaleWhileRevalidate(request, CACHE_NAMES.API);
} else if (isAssetRequest(url.pathname)) {
  // CacheFirst - check cache first, fallback to network
  handleCacheFirst(request, CACHE_NAMES.ASSETS);
} else if (isImageRequest(url.pathname)) {
  // CacheFirst with shorter TTL for images
  handleCacheFirst(request, CACHE_NAMES.IMAGES);
} else {
  // NetworkFirst with timeout - try network first, fallback to cache
  handleNetworkFirst(request, CACHE_NAMES.HTML, 3000);
}
```

### Cache Names
- `nyt-html-v1` - HTML pages
- `nyt-api-v1` - API responses
- `nyt-assets-v1` - Static assets (JS, CSS, fonts)
- `nyt-images-v1` - Images

## TanStack Query Configuration

### Default Settings
```typescript
export const queryDefaults = {
  queries: {
    staleTime: 60_000,        // 1 minute fresh
    gcTime: 300_000,          // 5 minutes in cache
    refetchOnWindowFocus: false,
    retry: 1,
    refetchOnReconnect: false,
    refetchOnMount: true,
  },
  mutations: {
    retry: 1,
  },
};
```

## Monitoring & Observability

### Cache Health Dashboard
Access at `/cache-health` to monitor:
- Cache hit ratios
- Response times
- Cache statistics
- Performance metrics

### Logging
- `X-Cache-Status` header indicates cache status (HIT/MISS/STALE/REVAL)
- Console logs for cache operations
- Performance metrics for cache timing

### Metrics
- **Hit Ratio**: Target >80% for optimal performance
- **Response Time**: P95 <1000ms
- **Cache Efficiency**: Excellent/Good/Needs Improvement

## Performance Testing

### K6 Load Testing
```bash
# Run cache smoke test
bun run k6:smoke

# Test with custom URL
k6 run scripts/k6-cache-smoke.js --env BASE_URL=https://your-domain.com
```

### Test Scenarios
- 50 concurrent users for 1 minute
- Mixed requests: 60% search, 20% top stories, 20% article details
- Validates cache hit rates >40% and P95 response times <1000ms

## Environment Configuration

### Required Environment Variables
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Build Configuration
BUILD_ID=20240101-dev

# Cache Configuration
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300

# Admin Configuration
ADMIN_API_KEY=your-secure-admin-key
```

## Best Practices

### Do's
- ✅ Use deterministic cache keys with stable hashing
- ✅ Implement proper cache invalidation with tags
- ✅ Set appropriate TTLs based on content volatility
- ✅ Use conditional requests with ETags
- ✅ Monitor cache performance and hit ratios
- ✅ Test cache behavior under load

### Don'ts
- ❌ Never cache user-specific data publicly
- ❌ Don't use overly long TTLs for dynamic content
- ❌ Avoid cache stampede with proper key design
- ❌ Don't ignore cache headers in responses
- ❌ Never expose sensitive data in cache keys

## Troubleshooting

### Common Issues

#### Low Cache Hit Ratio
- Check if cache keys are deterministic
- Verify TTL settings are appropriate
- Ensure proper cache invalidation isn't too aggressive

#### High Response Times
- Monitor cache miss rates
- Check Redis performance
- Verify network connectivity

#### Cache Inconsistency
- Check BUILD_ID is consistent across deployments
- Verify tag-based invalidation is working
- Ensure cache keys are properly scoped

### Debug Commands
```bash
# Check Redis connection
redis-cli ping

# View cache statistics
curl /cache-health

# Purge specific cache
bun tsx scripts/purgeTag.ts tag:articles

# Run performance test
bun run k6:smoke
```

## Rollback Strategy

If caching issues occur:

1. **Disable caching**: Set `CACHE_ENABLED=false`
2. **Purge all caches**: `bun tsx scripts/purgeTag.ts tag:*`
3. **Revert to previous BUILD_ID**
4. **Monitor performance** and gradually re-enable

## Security Considerations

- Cache keys don't expose sensitive data
- Private endpoints use no-cache headers
- Admin purge endpoints require authentication
- BUILD_ID prevents cache poisoning across deployments
- Tag-based invalidation prevents data leaks

## Future Enhancements

- [ ] Implement cache warming strategies
- [ ] Add cache compression for large responses
- [ ] Implement cache analytics and alerting
- [ ] Add cache versioning for API evolution
- [ ] Implement distributed cache invalidation
