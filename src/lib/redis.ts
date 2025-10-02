import Redis from 'ioredis';
import crypto from 'crypto';

// Redis client configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Build ID for cache invalidation across deployments
function getBuildId(): string {
  return process.env.BUILD_ID || 'dev';
}

/**
 * Creates a stable hash from any object by sorting keys and normalizing strings
 */
export function stableHash(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    return obj.toLowerCase().trim();
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    const sortedItems = obj
      .map(item => stableHash(item))
      .sort();
    return `[${sortedItems.join(',')}]`;
  }
  
  if (typeof obj === 'object') {
    const entries = Object.entries(obj)
      .map(([key, value]) => [key.toLowerCase().trim(), stableHash(value)])
      .sort(([a], [b]) => a.localeCompare(b));
    
    return `{${entries.map(([k, v]) => `${k}:${v}`).join(',')}}`;
  }
  
  return String(obj);
}

/**
 * Creates a deterministic cache key with BUILD_ID prefix
 */
export function ckey(parts: string[]): string {
  const validParts = parts.filter(Boolean).map(part => 
    String(part).replace(/:/g, '\\:').toLowerCase().trim()
  );
  return `BUILD_${getBuildId()}:${validParts.join(':')}`;
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      // Return raw string if JSON parsing fails
      return value as unknown as T;
    }
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet(
  key: string, 
  value: any, 
  ttlSec: number
): Promise<boolean> {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(key, ttlSec, serialized);
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
}

/**
 * Delete a key from cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
}

/**
 * Attach tags to cache keys for invalidation
 */
export async function tagAttach(tag: string, ...keys: string[]): Promise<boolean> {
  try {
    const tagKey = `tag:${tag}`;
    await redis.sadd(tagKey, ...keys);
    return true;
  } catch (error) {
    console.error('Redis TAG ATTACH error:', error);
    return false;
  }
}

/**
 * Purge all keys associated with a tag
 */
export async function purgeByTag(tag: string): Promise<number> {
  try {
    const tagKey = `tag:${tag}`;
    const keys = await redis.smembers(tagKey);
    
    if (keys.length === 0) return 0;
    
    // Delete all tagged keys
    const deleted = await redis.del(...keys);
    
    // Remove the tag set itself
    await redis.del(tagKey);
    
    return deleted;
  } catch (error) {
    console.error('Redis PURGE BY TAG error:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  keys: number;
  memory: string;
}> {
  try {
    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';
    
    // Count keys with our BUILD_ID prefix
    const pattern = `BUILD_${getBuildId()}:*`;
    const keys = await redis.keys(pattern);
    
    return {
      hits: 0, // Would need to track this separately
      misses: 0, // Would need to track this separately
      keys: keys.length,
      memory,
    };
  } catch (error) {
    console.error('Redis STATS error:', error);
    return {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 'error',
    };
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch (error) {
    console.error('Redis CLOSE error:', error);
  }
}

export { redis, getBuildId };
