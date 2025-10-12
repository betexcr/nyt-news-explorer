import { getBackendApiUrl } from '../config/api';

/**
 * Configuration for image proxy
 */
export const IMAGE_PROXY_CONFIG = {
  // Enable/disable proxy globally
  enabled: false, // Set to true to enable proxy for all external images
  
  // Only proxy specific domains (NYT images that commonly fail)
  proxyDomains: [
    'static01.nyt.com',
    'static.nytimes.com',
    'nyt.com',
  ],
};

/**
 * Check if a URL should be proxied through our API
 */
export function shouldProxyImage(url: string): boolean {
  if (!IMAGE_PROXY_CONFIG.enabled) {
    return false;
  }
  
  // Don't proxy local images
  if (url.startsWith('/') || url.startsWith('data:')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return IMAGE_PROXY_CONFIG.proxyDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );
  } catch {
    return false;
  }
}

/**
 * Get the proxied URL for an image
 */
export function getProxiedImageUrl(url: string): string {
  if (!shouldProxyImage(url)) {
    return url;
  }
  
  const proxyUrl = getBackendApiUrl('/proxy/image');
  const encodedUrl = encodeURIComponent(url);
  return `${proxyUrl}?url=${encodedUrl}`;
}

/**
 * Get image URL with optional proxy
 * This is the main function to use throughout the app
 */
export function getImageUrl(url: string, forceProxy = false): string {
  if (forceProxy) {
    const proxyUrl = getBackendApiUrl('/proxy/image');
    const encodedUrl = encodeURIComponent(url);
    return `${proxyUrl}?url=${encodedUrl}`;
  }
  
  return getProxiedImageUrl(url);
}

/**
 * Enable/disable image proxy at runtime
 */
export function setImageProxyEnabled(enabled: boolean): void {
  IMAGE_PROXY_CONFIG.enabled = enabled;
}

/**
 * Add domain to proxy list
 */
export function addProxyDomain(domain: string): void {
  if (!IMAGE_PROXY_CONFIG.proxyDomains.includes(domain)) {
    IMAGE_PROXY_CONFIG.proxyDomains.push(domain);
  }
}

