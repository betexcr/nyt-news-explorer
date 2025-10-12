import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const cacheHitRate = new Rate('cache_hit_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up
    { duration: '1m', target: 50 },  // Stay at 50 VUs
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    cache_hit_rate: ['rate>0.4'],      // Cache hit rate should be above 40%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const searchQueries = [
  'technology',
  'politics',
  'business',
  'sports',
  'science',
  'health',
  'climate',
  'economy',
  'covid',
  'artificial intelligence'
];

const sections = [
  'home',
  'technology',
  'business',
  'sports',
  'science',
  'health',
  'world',
  'us'
];

export default function() {
  const testType = Math.random();
  
  if (testType < 0.6) {
    // 60% of requests: Search API
    testSearchAPI();
  } else if (testType < 0.8) {
    // 20% of requests: Top Stories API
    testTopStoriesAPI();
  } else {
    // 20% of requests: Article detail API
    testArticleDetailAPI();
  }
  
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5s
}

function testSearchAPI() {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const params = {
    q: query,
    page: Math.floor(Math.random() * 3), // Pages 0-2
    sort: ['newest', 'oldest', 'relevance'][Math.floor(Math.random() * 3)]
  };
  
  const url = `${BASE_URL}/api/articles/search`;
  const response = http.get(url, { params });
  
  const cacheStatus = response.headers['X-Cache-Status'];
  const isHit = cacheStatus === 'HIT';
  cacheHitRate.add(isHit);
  
  check(response, {
    'search status is 200 or 304': (r) => r.status === 200 || r.status === 304,
    'search response time < 1s': (r) => r.timings.duration < 1000,
    'search has cache headers': (r) => r.headers['ETag'] && r.headers['Cache-Control'],
    'search has X-Cache-Status': (r) => r.headers['X-Cache-Status'],
  });
  
  if (response.status !== 200 && response.status !== 304) {
    console.error(`Search API error: ${response.status} - ${response.body}`);
  }
}

function testTopStoriesAPI() {
  const section = sections[Math.floor(Math.random() * sections.length)];
  const url = `${BASE_URL}/api/top-stories/${section}`;
  
  const response = http.get(url);
  
  const cacheStatus = response.headers['X-Cache-Status'];
  const isHit = cacheStatus === 'HIT';
  cacheHitRate.add(isHit);
  
  check(response, {
    'top stories status is 200 or 304': (r) => r.status === 200 || r.status === 304,
    'top stories response time < 1s': (r) => r.timings.duration < 1000,
    'top stories has cache headers': (r) => r.headers['ETag'] && r.headers['Cache-Control'],
    'top stories has X-Cache-Status': (r) => r.headers['X-Cache-Status'],
  });
  
  if (response.status !== 200 && response.status !== 304) {
    console.error(`Top Stories API error: ${response.status} - ${response.body}`);
  }
}

function testArticleDetailAPI() {
  // Use a sample article ID - in real tests, you'd have a list of valid IDs
  const articleId = 'https://www.nytimes.com/2023/01/01/technology/sample-article.html';
  const url = `${BASE_URL}/api/article/${encodeURIComponent(articleId)}`;
  
  const response = http.get(url);
  
  const cacheStatus = response.headers['X-Cache-Status'];
  const isHit = cacheStatus === 'HIT';
  cacheHitRate.add(isHit);
  
  check(response, {
    'article detail status is 200, 304, or 404': (r) => [200, 304, 404].includes(r.status),
    'article detail response time < 1s': (r) => r.timings.duration < 1000,
    'article detail has cache headers': (r) => r.headers['ETag'] && r.headers['Cache-Control'],
    'article detail has X-Cache-Status': (r) => r.headers['X-Cache-Status'],
  });
  
  if (![200, 304, 404].includes(response.status)) {
    console.error(`Article Detail API error: ${response.status} - ${response.body}`);
  }
}

export function handleSummary(data) {
  const cacheHitPercentage = (data.metrics.cache_hit_rate.rate * 100).toFixed(1);
  const avgResponseTime = data.metrics.http_req_duration.avg.toFixed(0);
  const p95ResponseTime = data.metrics.http_req_duration['p(95)'].toFixed(0);
  
  console.log(`\n=== Cache Performance Summary ===`);
  console.log(`Cache Hit Rate: ${cacheHitPercentage}%`);
  console.log(`Average Response Time: ${avgResponseTime}ms`);
  console.log(`95th Percentile Response Time: ${p95ResponseTime}ms`);
  console.log(`Total Requests: ${data.metrics.http_reqs.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.count}`);
  
  // Determine if cache is working well
  const cacheWorking = data.metrics.cache_hit_rate.rate > 0.4;
  const performanceGood = data.metrics.http_req_duration['p(95)'] < 1000;
  
  if (cacheWorking && performanceGood) {
    console.log(`✅ Cache performance is GOOD`);
  } else if (cacheWorking) {
    console.log(`⚠️  Cache hit rate is good but response times need improvement`);
  } else {
    console.log(`❌ Cache performance needs improvement`);
  }
  
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
