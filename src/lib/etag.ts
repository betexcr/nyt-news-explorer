import crypto from 'crypto';

/**
 * Generate ETag from body content using SHA1
 * Returns quoted hash as per HTTP specification
 */
export function makeETag(body: string | Buffer): string {
  const hash = crypto.createHash('sha1');
  
  if (Buffer.isBuffer(body)) {
    hash.update(body);
  } else {
    hash.update(body, 'utf8');
  }
  
  const digest = hash.digest('hex');
  return `"${digest}"`;
}

/**
 * Generate weak ETag (not commonly used, but available if needed)
 */
export function makeWeakETag(body: string | Buffer): string {
  return `W/${makeETag(body)}`;
}

/**
 * Extract ETag from If-None-Match header
 */
export function extractETag(ifNoneMatch: string | undefined): string | null {
  if (!ifNoneMatch) return null;
  
  // Handle multiple ETags (comma-separated)
  const etags = ifNoneMatch.split(',').map(etag => etag.trim());
  
  // Return the first valid ETag
  for (const etag of etags) {
    if (etag.startsWith('"') && etag.endsWith('"')) {
      return etag;
    }
    if (etag.startsWith('W/"') && etag.endsWith('"')) {
      return etag;
    }
  }
  
  return null;
}

/**
 * Check if two ETags match
 */
export function etagMatches(etag1: string, etag2: string): boolean {
  // Normalize ETags by removing quotes and W/ prefix
  const normalize = (etag: string) => {
    return etag.replace(/^W\//, '').replace(/^"/, '').replace(/"$/, '');
  };
  
  return normalize(etag1) === normalize(etag2);
}
