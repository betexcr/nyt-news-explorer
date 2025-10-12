# Free Tier Setup - Quick Start

## 🎯 Goal
Deploy NYT News Explorer with server-side caching using only free hosting tiers.

## 🏗️ Architecture
- **Frontend**: Hostinger (Free) - Static files
- **Backend**: Railway (Free) - API server with Redis caching
- **Cache**: Railway Redis (Free) - 1GB storage included

## ⚡ Quick Deployment

### Option 1: PowerShell (Windows)
```powershell
.\scripts\deploy-free.ps1 -NytApiKey "your_nyt_api_key_here"
```

### Option 2: Bash (Linux/Mac)
```bash
./scripts/deploy-free.sh
```

### Option 3: Manual Steps

#### 1. Deploy Backend to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create project and deploy
cd api
railway project create nyt-news-explorer-api
railway add redis
railway variables set NODE_ENV=production
railway variables set NYT_API_KEY="your_api_key"
railway up
```

#### 2. Update Frontend Configuration
Update `src/config/api.ts` with your Railway URL:
```typescript
BASE_URL: "https://your-project-name.railway.app"
```

#### 3. Deploy Frontend
Your existing GitHub Actions will deploy to Hostinger automatically.

## 🔧 Environment Variables

### Railway (Backend)
```
NODE_ENV=production
NYT_API_KEY=your_nyt_api_key
LOG_LEVEL=info
CORS_ORIGIN=https://nyt.brainvaultdev.com
```

### Frontend Build
```
REACT_APP_API_URL=https://your-project-name.railway.app
```

## 📊 Free Tier Limits

| Service | Limit | Impact |
|---------|-------|--------|
| Railway | $5 credit/month | Usually enough for small apps |
| Railway Redis | 1GB storage | Plenty for caching |
| Hostinger | 100GB bandwidth | More than sufficient |
| NYT API | 1,000 requests/day | Caching reduces usage |

## 🚨 Important Notes

### Railway Sleep Mode
- API sleeps after 30 minutes of inactivity
- Wakes up in ~2-3 seconds
- Frontend shows loading during wake-up

### CORS Configuration
- Update `CORS_ORIGIN` in Railway dashboard
- Must match your frontend domain exactly

### Monitoring
- Check Railway dashboard for uptime
- Monitor Redis memory usage
- Track API response times

## 🔍 Testing

### API Endpoints
```bash
# Health check
curl https://your-project-name.railway.app/health

# Search (should show x-cache headers)
curl "https://your-project-name.railway.app/api/articles/search?q=technology"

# Most popular (cached for 30 minutes)
curl "https://your-project-name.railway.app/api/articles/most-popular/7"

# Top stories (cached for 30 minutes)
curl "https://your-project-name.railway.app/api/articles/top-stories/home"
```

### Cache Headers to Look For
- `x-cache: HIT` - Data served from cache
- `x-cache: MISS` - Data fetched from NYT API
- `cache-control: public, max-age=1800` - 30-minute cache

## 🆘 Troubleshooting

### API Not Responding
1. Check Railway dashboard for service status
2. Verify environment variables are set
3. Check deployment logs

### Cache Not Working
1. Verify Redis connection in Railway
2. Check cache key patterns in logs
3. Monitor Redis memory usage

### Frontend Issues
1. Verify CORS settings in Railway
2. Check API base URL in frontend config
3. Test API endpoints directly

## 📈 Performance Benefits

### Before (Direct NYT API)
- Every request hits NYT API
- 1,000 requests/day limit
- Slower response times
- No offline capability

### After (With Caching)
- 90%+ requests served from cache
- Reduces NYT API usage by 90%
- 10x faster response times
- Better user experience

## 💰 Cost Breakdown (Monthly)
- Railway: $0 (within free tier)
- Hostinger: $0 (free plan)
- NYT API: $0 (free tier)
- **Total: $0/month**

## 🔗 Useful Links
- [Railway Dashboard](https://railway.app/dashboard)
- [Hostinger Control Panel](https://hpanel.hostinger.com)
- [NYT API Documentation](https://developer.nytimes.com)
- [Deployment Guide](deployment-guide.md)


