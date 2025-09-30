import type { Context } from "https://edge.netlify.com";

interface PerformanceMetrics {
  timestamp: number;
  url: string;
  userAgent: string;
  country: string;
  region: string;
  city: string;
  responseTime: number;
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS';
  contentLength: number;
}

export default async (request: Request, context: Context) => {
  const startTime = Date.now();
  const url = new URL(request.url);
  
  // Skip monitoring for static assets and internal requests
  if (url.pathname.startsWith('/static/') || 
      url.pathname.startsWith('/.netlify/') ||
      url.pathname.includes('.')) {
    return;
  }

  // Get geo information
  const country = context.geo?.country?.code || 'unknown';
  const region = context.geo?.subdivision?.code || 'unknown';
  const city = context.geo?.city || 'unknown';

  // Process the request
  const response = await context.next();
  const endTime = Date.now();
  const responseTime = endTime - startTime;

  // Determine cache status
  let cacheStatus: 'HIT' | 'MISS' | 'BYPASS' = 'BYPASS';
  const cacheControl = response.headers.get('Cache-Control');
  const xCache = response.headers.get('X-Cache');
  
  if (xCache === 'HIT') {
    cacheStatus = 'HIT';
  } else if (xCache === 'MISS') {
    cacheStatus = 'MISS';
  } else if (cacheControl && cacheControl.includes('max-age')) {
    cacheStatus = 'MISS';
  }

  // Collect performance metrics
  const metrics: PerformanceMetrics = {
    timestamp: Date.now(),
    url: url.pathname,
    userAgent: request.headers.get('User-Agent') || 'unknown',
    country,
    region,
    city,
    responseTime,
    cacheStatus,
    contentLength: parseInt(response.headers.get('Content-Length') || '0')
  };

  // Log metrics (in production, you'd send this to an analytics service)
  console.log('Performance Metrics:', JSON.stringify(metrics));

  // Add performance headers to response
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Response-Time', responseTime.toString());
  newHeaders.set('X-Cache-Status', cacheStatus);
  newHeaders.set('X-Edge-Location', `${city}, ${region}, ${country}`);

  // Add resource hints for better performance
  if (url.pathname === '/') {
    newHeaders.set('Link', '</static/css/main.css>; rel=preload; as=style, </static/js/main.js>; rel=preload; as=script');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
};

