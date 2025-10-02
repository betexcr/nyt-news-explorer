# NYT API Simple

A simple Node.js API server with Redis caching for the NYT News Explorer.

## Environment Variables

- `REDIS_URL`: Redis connection URL (required)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (default: production)

## Deployment

### Render
1. Connect your GitHub repository
2. Set environment variables:
   - `REDIS_URL=rediss://default:...@hardy-jackass-16664.upstash.io:6379`
3. Deploy

### Railway
1. Connect your repository
2. Set environment variables
3. Deploy

## Endpoints

- `GET /api` - API info (cached 60s)
- `GET /api/v1/articles/top-stories/:section` - Top stories (cached 15min)
- `GET /api/v1/articles/most-popular/:period` - Most popular (cached 15min)
- `GET /health` - Health check

## Cache Headers

- `x-cache: MISS` - First request
- `x-cache: HIT` - Cached response
- `etag` - ETag for conditional requests
- `cache-control` - Cache control directives
