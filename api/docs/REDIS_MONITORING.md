# Redis Cache Monitoring Guide

## Overview

Your NYT News Explorer API now includes comprehensive Redis cache monitoring and management endpoints. These are fully documented in your **Swagger UI** and allow you to inspect, monitor, and manage your Redis cache in real-time.

## 🎯 Quick Start

### Access the Swagger Documentation

1. **Start your API server:**
   ```bash
   cd api
   bun run dev
   ```

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:3000/docs
   ```

3. **Navigate to the "Admin" or "Cache" section** to see all Redis monitoring endpoints

## 📊 Available Endpoints

### 1. **Cache Status Dashboard** - `GET /api/v1/admin/cache/status`

Get comprehensive Redis cache statistics and current cached keys.

#### Query Parameters:
- `pattern` (string, optional) - Filter keys by pattern (e.g., `cache:*`, `search:*`)
  - Default: `*` (all keys)
- `limit` (integer, optional) - Maximum number of keys to return
  - Default: `100`
- `details` (boolean, optional) - Include detailed information (TTL, size, preview)
  - Default: `false`

#### Example Usage:

```bash
# Get all cache keys
curl http://localhost:3000/api/v1/admin/cache/status

# Get only search-related cache keys with details
curl "http://localhost:3000/api/v1/admin/cache/status?pattern=cache:GET:*search*&details=true&limit=50"

# Get cache keys for articles endpoint
curl "http://localhost:3000/api/v1/admin/cache/status?pattern=cache:*articles*"
```

#### Response Example:

```json
{
  "timestamp": "2025-10-12T10:30:00.000Z",
  "redis": {
    "connected": true,
    "host": "configured",
    "port": 6379,
    "db": 0,
    "version": "7.0.11",
    "uptime": 86400
  },
  "statistics": {
    "totalKeys": 245,
    "matchingKeys": 100,
    "cacheHitRate": 0.85,
    "memoryUsage": "12.5M",
    "uptimeSeconds": 86400
  },
  "keys": [
    {
      "key": "cache:GET:/api/v1/articles/search?q=technology",
      "ttl": 1680,
      "type": "string",
      "size": 4523,
      "preview": "{\"articles\":[{\"title\":\"Tech News\"...}..."
    }
  ],
  "cacheTypes": {
    "GET": 230,
    "POST": 10,
    "unknown": 5
  },
  "pagination": {
    "pattern": "*",
    "limit": 100,
    "total": 245,
    "returned": 100,
    "hasMore": true
  }
}
```

---

### 2. **Inspect Specific Cache Key** - `GET /api/v1/admin/cache/inspect/:key`

Get detailed information about a specific cache key including its full value.

#### Parameters:
- `key` (path parameter) - The cache key to inspect (URL encode if needed)

#### Example Usage:

```bash
# Inspect a specific cache key
curl http://localhost:3000/api/v1/admin/cache/inspect/cache:GET:%2Fapi%2Fv1%2Farticles%2Fsearch%3Fq%3Dtechnology

# Or with proper encoding in code
const key = encodeURIComponent('cache:GET:/api/v1/articles/search?q=technology');
fetch(`http://localhost:3000/api/v1/admin/cache/inspect/${key}`)
```

#### Response Example:

```json
{
  "key": "cache:GET:/api/v1/articles/search?q=technology",
  "exists": true,
  "type": "string",
  "ttl": 1680,
  "ttlFormatted": "28m 0s",
  "value": {
    "etag": "\"abc123def456\"",
    "data": {
      "articles": [
        {
          "title": "Tech Innovation...",
          "url": "https://..."
        }
      ]
    },
    "timestamp": 1697120400000,
    "headers": {
      "content-type": "application/json"
    }
  },
  "size": 4523,
  "sizeFormatted": "4.42 KB",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 3. **Clear Cache** - `DELETE /api/v1/admin/cache`

Clear cache keys by pattern or clear all cache.

#### Query Parameters:
- `pattern` (string, optional) - Cache key pattern to clear (e.g., `search:*`)
  - Default: `*` (clear all)

#### Example Usage:

```bash
# Clear all cache
curl -X DELETE http://localhost:3000/api/v1/admin/cache

# Clear only search-related cache
curl -X DELETE "http://localhost:3000/api/v1/admin/cache?pattern=cache:*search*"

# Clear cache for specific endpoint
curl -X DELETE "http://localhost:3000/api/v1/admin/cache?pattern=cache:GET:/api/v1/articles/top-stories*"
```

#### Response Example:

```json
{
  "message": "Cache cleared successfully",
  "cleared": 45,
  "pattern": "cache:*search*"
}
```

---

### 4. **Warm Up Cache** - `POST /api/v1/admin/cache/warmup`

Pre-populate cache with frequently requested data.

#### Example Usage:

```bash
curl -X POST http://localhost:3000/api/v1/admin/cache/warmup
```

#### Response Example:

```json
{
  "message": "Cache warmup completed",
  "endpoints": [
    "/api/v1/articles/top-stories/home",
    "/api/v1/articles/top-stories/technology",
    "/api/v1/articles/top-stories/business",
    "/api/v1/articles/search?q=technology&sort=newest",
    "/api/v1/articles/search?q=business&sort=newest"
  ],
  "successful": 5,
  "failed": 0
}
```

---

### 5. **System Metrics** - `GET /api/v1/admin/metrics`

Get comprehensive system metrics including cache statistics, memory usage, and circuit breaker status.

#### Example Usage:

```bash
curl http://localhost:3000/api/v1/admin/metrics
```

#### Response Example:

```json
{
  "timestamp": "2025-10-12T10:30:00.000Z",
  "system": {
    "uptime": 86400,
    "memory": {
      "rss": 123456789,
      "heapTotal": 98765432,
      "heapUsed": 87654321,
      "external": 1234567,
      "arrayBuffers": 123456
    },
    "cpu": {
      "user": 12345678,
      "system": 1234567
    }
  },
  "application": {
    "version": "1.0.0",
    "environment": "development",
    "requests": {
      "total": 1234,
      "ratePerSecond": 10
    },
    "errors": {
      "total": 5,
      "ratePerSecond": 0.01
    },
    "cache": {
      "hitRate": 0.85,
      "size": 245,
      "evictions": 12
    }
  },
  "dependencies": {
    "circuitBreakers": {
      "external": {
        "state": "CLOSED",
        "successRate": 0.98
      }
    }
  }
}
```

---

## 🔍 Common Cache Key Patterns

Your API uses structured cache keys. Here are common patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| `cache:GET:*` | All GET request cache | All cached GET responses |
| `cache:*search*` | All search-related cache | Search queries and results |
| `cache:*articles*` | All article-related cache | Top stories, archives, etc. |
| `cache:GET:/api/v1/articles/top-stories*` | Top stories cache | Homepage articles |
| `BUILD_*` | Frontend build-specific cache | Deployment-specific cache |

## 🎨 Using in Your Frontend

You can also create a simple admin dashboard in your React app:

```typescript
// src/pages/AdminCachePage.tsx
import React, { useEffect, useState } from 'react';

interface CacheStatus {
  redis: {
    connected: boolean;
    version: string;
  };
  statistics: {
    totalKeys: number;
    memoryUsage: string;
    cacheHitRate: number;
  };
  keys: Array<{
    key: string;
    ttl: number | string;
    type: string;
  }>;
}

export function AdminCachePage() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [pattern, setPattern] = useState('*');
  
  useEffect(() => {
    fetchCacheStatus();
  }, [pattern]);
  
  const fetchCacheStatus = async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/admin/cache/status?pattern=${pattern}&limit=50`
    );
    const data = await response.json();
    setStatus(data);
  };
  
  const clearCache = async (pattern: string) => {
    await fetch(
      `http://localhost:3000/api/v1/admin/cache?pattern=${pattern}`,
      { method: 'DELETE' }
    );
    fetchCacheStatus();
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Redis Cache Monitor</h1>
      
      {status && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-gray-600">Total Keys</h3>
              <p className="text-3xl font-bold">{status.statistics.totalKeys}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-gray-600">Cache Hit Rate</h3>
              <p className="text-3xl font-bold">
                {(status.statistics.cacheHitRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-gray-600">Memory Usage</h3>
              <p className="text-3xl font-bold">{status.statistics.memoryUsage}</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between mb-4">
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Filter pattern (e.g., cache:*search*)"
                className="border px-4 py-2 rounded flex-1 mr-4"
              />
              <button
                onClick={() => clearCache(pattern)}
                className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
              >
                Clear Cache
              </button>
            </div>
            
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">TTL</th>
                  <th className="text-left p-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {status.keys.map((key, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-sm">{key.key}</td>
                    <td className="p-2">{key.ttl}</td>
                    <td className="p-2">{key.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

## 🔒 Security Notes

- All cache endpoints require **authentication** (Bearer token)
- Admin endpoints may require **admin role** (configure as needed)
- In production, ensure these endpoints are properly secured
- Consider adding IP whitelisting for admin endpoints

## 📈 Monitoring Best Practices

1. **Regular Monitoring**: Check cache hit rates regularly to ensure caching is effective
2. **Memory Usage**: Monitor Redis memory usage to prevent overflow
3. **Key Patterns**: Use consistent naming patterns for easier management
4. **TTL Strategy**: Review and adjust TTL values based on data freshness requirements
5. **Cache Warmup**: Run cache warmup during deployments or after cache clears

## 🚀 Production Deployment

When deploying to production (Railway, etc.):

1. **Environment Variables**: Ensure Redis connection is properly configured
   ```bash
   REDIS_URL=rediss://default:password@host:port
   # or
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

2. **Access Swagger Docs**:
   ```
   https://your-api-domain.com/docs
   ```

3. **Monitor Cache Headers**: Check response headers for cache status
   ```bash
   curl -I https://your-api-domain.com/api/v1/articles/search?q=tech
   
   # Look for:
   # x-cache: HIT or MISS
   # cache-control: public, max-age=1800
   # etag: "abc123..."
   ```

## 📖 Additional Resources

- [Swagger/OpenAPI Spec](http://localhost:3000/openapi.json)
- [Health Check Endpoint](http://localhost:3000/health)
- [Circuit Breaker Status](http://localhost:3000/health/circuit-breakers)

---

## Summary

✅ **Swagger UI** - Interactive API documentation at `/docs`  
✅ **Cache Status** - Real-time Redis monitoring at `/api/v1/admin/cache/status`  
✅ **Cache Inspection** - Detailed key inspection at `/api/v1/admin/cache/inspect/:key`  
✅ **Cache Management** - Clear and warm up cache endpoints  
✅ **System Metrics** - Comprehensive metrics at `/api/v1/admin/metrics`  

Your Redis cache is now fully observable and manageable! 🎉

