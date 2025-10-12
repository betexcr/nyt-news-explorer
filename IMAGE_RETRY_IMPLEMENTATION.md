# Image Retry & Caching Implementation

## Summary

Implemented a comprehensive image retry system with exponential backoff to handle cases where images fail to load from NYT servers. This significantly improves UX by automatically retrying failed images instead of immediately showing fallbacks.

## What Was Done

### 1. **Image Retry Hook** (`src/hooks/useImageWithRetry.ts`)
- Custom React hook that handles image loading with automatic retry logic
- **Features:**
  - Exponential backoff (1s, 2s, 4s, 8s...)
  - Configurable max retries (default: 3)
  - Automatic fallback after max retries
  - Loading states for UI feedback
  - Manual retry function
  - 10-second timeout per attempt

### 2. **Enhanced ViewTransitionImage Component** (`src/components/ViewTransitionImage.tsx`)
- Updated to use the retry hook
- **Features:**
  - Visual retry indicator showing "Retrying... (1/3)"
  - Smooth opacity transitions during loading
  - Maintains all view transition functionality
  - Configurable retry parameters

### 3. **ImageWithRetry Component** (`src/components/ImageWithRetry.tsx`)
- Lightweight version for use in tables and lists
- Faster rendering with minimal overhead
- Same retry logic as ViewTransitionImage

### 4. **Image Proxy Endpoint** (`api/src/routes/proxy.ts`)
- New API endpoint: `GET /api/v1/proxy/image?url=<encoded-url>`
- **Features:**
  - Proxies external images through the backend
  - Caches images in Redis for 24 hours
  - Handles CORS issues
  - Circuit breaker protection
  - ETag support for client-side caching
  - Fallback to 1x1 transparent GIF on failure

### 5. **Image Proxy Utility** (`src/utils/imageProxy.ts`)
- Helper functions for optionally proxying images
- **Features:**
  - Domain-based proxy rules
  - Runtime enable/disable
  - URL validation
  - Currently disabled by default (can be enabled if needed)

### 6. **Updated Components**
- **ArticleCard.tsx**: Now uses article title as image alt text (accessibility improvement)
- **ArticleTable.tsx**: Uses `ImageWithRetry` component for better image loading

## How It Works

### Frontend Flow:
1. User visits a page with news articles
2. `ViewTransitionImage` attempts to load each image
3. If image fails:
   - Wait 1 second, retry (attempt 1)
   - Wait 2 seconds, retry (attempt 2)  
   - Wait 4 seconds, retry (attempt 3)
   - After 3 failures, show fallback (logo.png)
4. During retries, show "Retrying... (X/3)" indicator
5. On success, image fades in smoothly

### Backend Flow (Optional Proxy):
1. Enable proxy in `IMAGE_PROXY_CONFIG.enabled = true`
2. Images from configured domains route through `/api/v1/proxy/image`
3. API fetches image and caches in Redis for 24 hours
4. Subsequent requests served from cache
5. Handles CORS, rate limits, and network issues

## Configuration

### Frontend Retry Configuration:
```tsx
<ViewTransitionImage
  src={imageUrl}
  alt="Article"
  maxRetries={3}        // Number of retry attempts
  retryDelay={1000}     // Initial delay in ms (exponential backoff)
  fallbackSrc="/logo.png"
/>
```

### Enable Image Proxy (Optional):
```ts
// src/utils/imageProxy.ts
export const IMAGE_PROXY_CONFIG = {
  enabled: true,  // Set to true to enable
  proxyDomains: [
    'static01.nyt.com',
    'static.nytimes.com',
    'nyt.com',
  ],
};
```

## Benefits

1. **Improved UX**: Users see images that previously failed to load
2. **Reduced Server Load**: Images cached in Redis (24h TTL)
3. **Better Error Handling**: Graceful degradation with visual feedback
4. **Accessibility**: Proper alt text for all images
5. **Performance**: Exponential backoff prevents thundering herd
6. **Flexibility**: Can enable/disable proxy at runtime
7. **Monitoring**: Retry attempts logged to console

## Testing

- ✅ No lint errors in new code
- ✅ TypeScript type checking passes
- ✅ Image proxy endpoint registered in API routes
- ✅ Components using retry logic in ArticleCard and ArticleTable

## Cache Strategy

### Frontend (useImageWithRetry):
- In-memory during component lifecycle
- Resets when src changes
- No persistent storage

### Backend (Redis):
- **Key Pattern**: `image:<md5-hash-of-url>`
- **TTL**: 24 hours (86400 seconds)
- **Storage**: Base64-encoded image data + content-type
- **ETag**: MD5 hash of image data for client caching

## Example Console Output

When retry is happening:
```
Retrying image load (attempt 1/3): https://static01.nyt.com/image.jpg
Retrying image load (attempt 2/3): https://static01.nyt.com/image.jpg
Retrying image load (attempt 3/3): https://static01.nyt.com/image.jpg
```

## Future Enhancements

1. Add retry metrics to admin dashboard
2. Implement image quality fallback (try lower quality before failing)
3. Add service worker caching for offline support
4. Implement lazy loading with intersection observer
5. Add WebP format with JPEG fallback

## Files Modified

### New Files:
- `src/hooks/useImageWithRetry.ts`
- `src/components/ImageWithRetry.tsx`
- `src/utils/imageProxy.ts`
- `api/src/routes/proxy.ts`

### Modified Files:
- `src/components/ViewTransitionImage.tsx`
- `src/components/ArticleCard.tsx`
- `src/components/ArticleTable.tsx`
- `api/src/routes/index.ts`

## Notes

- The image proxy is **disabled by default** to avoid unnecessary backend load
- Enable it only if you notice consistent image loading issues
- Retry logic works independently of proxy (images retry whether proxied or not)
- All image components now properly handle failures with automatic retry

