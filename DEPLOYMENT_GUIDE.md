# NYT News Explorer - Cache Busting Deployment Guide

## Problem
The website at https://nyt.brainvaultdev.com is serving an old JavaScript bundle despite recent Redis cache updates.

## Root Cause
Multiple caching layers are causing stale content:
1. Browser cache
2. CDN cache (Vercel Edge Network)
3. Build cache
4. Service Worker cache

## Solution Steps

### 1. Local Validation
```bash
# Clean all caches and build fresh
rm -rf build/ .vercel/ node_modules/.cache/
npm ci  # or bun install
npm run build:force  # or bun run build:force
```

### 2. Deploy to Vercel with Cache Invalidation

#### Option A: Using the Force Deploy Script
```bash
./scripts/force-vercel-deploy.sh
```

#### Option B: Manual Vercel Deployment
1. **Push changes to git:**
   ```bash
   git add .
   git commit -m "fix: force cache invalidation for JS/CSS bundles"
   git push origin master
   ```

2. **Deploy via Vercel CLI:**
   ```bash
   vercel --prod --force --no-cache
   ```

3. **Or via Vercel Dashboard:**
   - Go to your Vercel project
   - Click "Redeploy" 
   - **UNCHECK** "Use existing Build Cache"
   - Click "Redeploy"

### 3. Post-Deployment Cache Clearing

#### Vercel CDN Cache Purge
1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to "Caches" section
3. Click "Purge CDN Cache"
4. Wait 2-3 minutes for propagation

#### Browser Cache Clearing
- **Hard Refresh:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- **Incognito Mode:** Test in private/incognito browser window
- **Clear Browser Cache:** Clear all cached data for the domain

### 4. Verification Steps

1. **Check Response Headers:**
   ```bash
   curl -I https://nyt.brainvaultdev.com/static/js/main.*.js
   ```
   Should show: `Cache-Control: no-cache, no-store, must-revalidate`

2. **Check JavaScript Bundle:**
   - Open DevTools → Network tab
   - Hard refresh the page
   - Look for the main JavaScript file
   - Check if it has the latest timestamp

3. **Test Redis Cache:**
   ```bash
   curl https://nyt.brainvaultdev.com/api
   ```
   Should show: `x-cache: HIT` or `x-cache: MISS`

## Configuration Changes Made

### 1. Updated `public/_headers`
- Changed JS/CSS cache headers to `no-cache, no-store, must-revalidate`
- Added `Pragma: no-cache` and `Expires: 0`

### 2. Updated `vercel.json`
- Added headers configuration for JS/CSS files
- Set proper cache invalidation headers

### 3. Added Force Build Script
- Created `scripts/force-vercel-deploy.sh`
- Added `build:force` npm script

## Troubleshooting

### If Old Bundle Still Shows:
1. **Check Service Worker:**
   - Open DevTools → Application → Service Workers
   - Click "Unregister" if present
   - Hard refresh

2. **Check CDN Propagation:**
   - Wait 5-10 minutes for global CDN propagation
   - Test from different locations/devices

3. **Force Complete Cache Clear:**
   ```bash
   # Clear all Vercel caches
   vercel --prod --force --no-cache
   
   # Or via dashboard: Settings → Caches → Purge All
   ```

### If API Cache Issues:
1. **Check Redis Connection:**
   ```bash
   curl https://nyt.brainvaultdev.com/health
   ```

2. **Clear Redis Cache:**
   - Access your Redis instance
   - Run `FLUSHDB` to clear all cached data

## Monitoring

### Success Indicators:
- ✅ JavaScript bundle has recent timestamp
- ✅ API responses show `x-cache: HIT` for cached data
- ✅ No console errors in browser
- ✅ All features working correctly

### Cache Headers to Verify:
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

## Prevention for Future Updates

1. **Always use `--no-cache` flag for Vercel deployments**
2. **Purge CDN cache after each deployment**
3. **Test in incognito mode after deployment**
4. **Monitor cache headers in production**

---

**Last Updated:** $(date)
**Deployment Status:** Ready for force deployment
