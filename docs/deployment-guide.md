# Free Tier Deployment Guide

## Overview
This guide shows how to deploy the NYT News Explorer with server-side caching using only free hosting tiers.

## Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Hostinger     │    │     Railway      │    │    Railway      │
│   (Frontend)    │────│   (Backend API)  │────│     (Redis)     │
│   Static Files  │    │   Fastify Server │    │   Cache Store   │
│   Free Tier     │    │   Free Tier      │    │   Free Tier     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. You'll get $5 credit monthly (usually enough for small apps)

### 1.2 Deploy Backend API
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway project create nyt-news-explorer-api

# Navigate to API directory
cd api

# Deploy to Railway
railway up
```

### 1.3 Add Redisestari Service
1. In Railway dashboard, click "Add Service"
2. Select "Redis"
3. Railway will automatically set `REDIS_URL` environment variable

### 1.4 Set Environment Variables
In Railway dashboard, add these variables:
```
NODE_ENV=production
NYT_API_KEY=your_nyt_api_key_here
LOG_LEVEL=info
CORS_ORIGIN=https://nyt.brainvaultdev.com
```

## Step 2: Update Frontend Configuration

### 2.1 Update API Base URL
Update `src/config/api.ts` to use your Railway URL:
```typescript
export const API_BASE_URL = 'https://your-project-name.railway.app';
```

### 2.2 Deploy Frontend
Your existing GitHub Actions workflow will deploy the frontend to Hostinger as usual.

## Step 3: Test the Setup

### 3.1 Test API Endpoints
```bash
# Test health endpoint
curl https://your-project-name.railway.app/health

# Test search endpoint
curl "https://your-project-name.railway.app/api/articles/search?q=technology"

# Test most popular endpoint
curl "https://your-project-name.railway.app/api/articles/most-popular/7"

# Test top stories endpoint
curl "https://your-project-name.railway.app/api/articles/top-stories/home"
```

### 3.2 Verify Caching
Check the response headers for:
- `x-cache: HIT` or `x-cache: MISS`
- `cache-control: public, max-age=1800`
- `etag: "hash"`

## How Caching Works in Production

### Server-Side Caching (Redis)
- **Location**: Railway Redis service
- **TTL**: 30 minutes for most data
- **Cache Keys**:
  - `search:query_hash` - Search results
  - `most-popular:7` - Trending articles
  - `top-stories:home` - Top stories
- **Benefits**: Reduces NYT API calls, faster responses

### Client-Side Caching (Browser)
- **Location**: Browser memory
- **TTL**: 5 minutes
- **Benefits**: Instant navigation, offline-like experience

### Cache Warmup
- **Automatic**: Runs every 20 minutes
- **Critical Data**: Preloads homepage data
- **Common Searches**: Preloads popular search terms

## Free Tier Limitations

### Railway
- **Sleep Time**: 30 minutes of inactivity
- **Wake Time**: ~2-3 seconds
- **Bandwidth**: Included in $5 credit
- **Storage**: 1GB Redis included

### Hostinger
- **Bandwidth**: 100GB/month
- **Storage**: 10GB
- **No server-side processing**

### Mitigation Strategies
1. **Keep-Alive**: Frontend makes periodic requests to keep API awake
2. **Graceful Degradation**: Fallback to mock data if API is sleeping
3. **User Education**: Show loading states during wake-up

## Monitoring

### Railway Dashboard
- Monitor API uptime
- Check Redis memory usage
- View deployment logs

### Frontend Monitoring
- Track cache hit rates
- Monitor API response times
- Alert on failed requests

## Cost Breakdown (Monthly)
- **Railway**: $0 (within free tier)
- **Hostinger**: $0 (free plan)
- **NYT API**: $0 (free tier: 1,000 requests/day)
- **Total**: $0/month

## Troubleshooting

### API Not Responding
1. Check Railway dashboard for service status
2. Verify environment variables are set
3. Check logs for errors

### Cache Issues
1. Verify Redis connection in Railway
2. Check cache key patterns
3. Monitor Redis memory usage

### Frontend Issues
1. Verify CORS settings
2. Check API base URL
3. Test API endpoints directly

## Security Considerations

### Environment Variables
- Never commit API keys to Git
- Use Railway's secure environment variable storage
- Rotate keys regularly

### CORS Configuration
- Restrict origins to your domain
- Use HTTPS in production
- Validate all inputs

### Rate Limiting
- Implement per-IP limits
- Monitor for abuse
- Use circuit breakers for external APIs

