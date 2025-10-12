# Manual Railway Setup Guide

Since Railway CLI requires interactive authentication, here's a step-by-step manual setup guide.

## Step 1: Railway Authentication

### Option A: CLI Login (Recommended)
```bash
# Open a new terminal/command prompt
npx @railway/cli login

# This will open your browser for GitHub authentication
# Follow the prompts to authorize Railway
```

### Option B: Web Dashboard
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. You'll be redirected to the dashboard

## Step 2: Create Project

### Option A: CLI Method
```bash
# Navigate to your API directory
cd api

# Initialize Railway project
npx @railway/cli init

# This will create a railway.json file and link your project
```

### Option B: Web Dashboard Method
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Empty Project"
4. Name it: `nyt-news-explorer-api`
5. Click "Deploy from GitHub repo" and select your repository
6. Set root directory to: `api`

## Step 3: Add Redis Service

### Option A: CLI Method
```bash
# Add Redis service
npx @railway/cli add redis
```

### Option B: Web Dashboard Method
1. In your project dashboard, click "Add Service"
2. Select "Redis"
3. Railway will automatically provision Redis and set `REDIS_URL`

## Step 4: Set Environment Variables

### Option A: CLI Method
```bash
# Set required environment variables
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=3000
npx @railway/cli variables set LOG_LEVEL=info
npx @railway/cli variables set NYT_API_KEY="your_nyt_api_key_here"
npx @railway/cli variables set CORS_ORIGIN="https://nyt.brainvaultdev.com"
```

### Option B: Web Dashboard Method
1. Go to your project dashboard
2. Click on your API service
3. Go to "Variables" tab
4. Add these variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `LOG_LEVEL` = `info`
   - `NYT_API_KEY` = `your_nyt_api_key_here`
   - `CORS_ORIGIN` = `https://nyt.brainvaultdev.com`

## Step 5: Deploy

### Option A: CLI Method
```bash
# Deploy to Railway
npx @railway/cli up
```

### Option B: Web Dashboard Method
1. Railway will automatically deploy when you push to GitHub
2. Or manually trigger deployment from the dashboard

## Step 6: Get Your API URL

### Option A: CLI Method
```bash
# Get your deployment URL
npx @railway/cli domain
```

### Option B: Web Dashboard Method
1. Go to your project dashboard
2. Click on your API service
3. Go to "Settings" tab
4. Find your Railway domain (e.g., `https://nyt-news-explorer-api-production-xxxx.up.railway.app`)

## Step 7: Update Frontend Configuration

Update `src/config/api.ts` with your Railway URL:

```typescript
export const API_CONFIG = {
  BACKEND: {
    BASE_URL: "https://your-railway-url.up.railway.app", // Replace with your actual URL
    ENDPOINTS: {
      SEARCH: "/api/articles/search",
      MOST_POPULAR: "/api/articles/most-popular",
      TOP_STORIES: "/api/articles/top-stories",
      ARTICLE_DETAIL: "/api/articles",
    }
  },
  // ... rest of config
};
```

## Step 8: Test Your Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/health

# Test search endpoint (should show x-cache headers)
curl "https://your-railway-url.up.railway.app/api/articles/search?q=technology"

# Test most popular endpoint
curl "https://your-railway-url.up.railway.app/api/articles/most-popular/7"
```

## Expected Response Headers

Look for these cache headers in your API responses:
- `x-cache: HIT` - Data served from Redis cache
- `x-cache: MISS` - Data fetched from NYT API
- `cache-control: public, max-age=1800` - 30-minute cache duration

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Make sure you're logged in: `npx @railway/cli whoami`
   - If not logged in: `npx @railway/cli login`

2. **"Project not found" Error**
   - Make sure you're in the `api` directory
   - Run `npx @railway/cli init` to create/link project

3. **Redis Connection Issues**
   - Verify Redis service is added: `npx @railway/cli add redis`
   - Check `REDIS_URL` environment variable is set

4. **Build Failures**
   - Check logs: `npx @railway/cli logs`
   - Verify `package.json` has correct start script
   - Ensure all dependencies are in `dependencies`, not `devDependencies`

### Useful Commands

```bash
# Check project status
npx @railway/cli status

# View deployment logs
npx @railway/cli logs

# Check environment variables
npx @railway/cli variables

# Open project dashboard
npx @railway/cli open

# Check who you're logged in as
npx @railway/cli whoami
```

## Next Steps

1. Deploy your frontend to Hostinger using your existing GitHub Actions
2. Test the complete application with caching
3. Monitor Railway dashboard for performance and usage

## Cost Monitoring

- Railway gives you $5 credit monthly
- Monitor usage in the Railway dashboard
- Redis usage is included in the free tier
- NYT API calls are reduced by 90%+ due to caching

Your deployment should now be live and caching NYT API responses!


