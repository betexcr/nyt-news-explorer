import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/**
 * k6 Load Test - Sustained load testing with realistic user patterns
 * Tests API behavior under normal and peak load conditions
 */

// Custom metrics for detailed monitoring
const errorRate = new Rate('error_rate');
const authSuccessRate = new Rate('auth_success_rate');  
const searchLatency = new Trend('search_latency', true);
const authLatency = new Trend('auth_latency', true);
const totalRequests = new Counter('total_requests');
const authFailures = new Counter('auth_failures');

// SLO thresholds - more comprehensive than smoke test
export const options = {
  // Load test configuration
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes  
    { duration: '2m', target: 20 },   // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 },   // Stay at 20 users for 5 minutes
    { duration: '2m', target: 50 },   // Peak load: 50 users over 2 minutes
    { duration: '3m', target: 50 },   // Peak load: maintain for 3 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 over 2 minutes
  ],
  
  // Stricter SLO thresholds for load testing
  thresholds: {
    // Response time SLOs under load
    'http_req_duration': [
      'p(95)<500',    // 95% under 500ms (relaxed from smoke test)
      'p(99)<1000',   // 99% under 1 second
      'med<150',      // Median under 150ms
      'avg<200'       // Average under 200ms
    ],
    
    // Error rate must stay low under load
    'http_req_failed': [
      'rate<0.02'     // Less than 2% error rate (slightly relaxed)
    ],
    
    // Custom business metrics
    'error_rate': [
      'rate<0.02'     // Business logic errors under 2%
    ],
    
    'auth_success_rate': [
      'rate>0.98'     // 98%+ authentication success rate
    ],
    
    // Service-specific SLOs
    'search_latency': [
      'p(95)<400',    // Search should remain fast
      'p(99)<800'
    ],
    
    'auth_latency': [
      'p(95)<300',    // Auth should be responsive
      'avg<150'
    ],
    
    // Throughput requirements
    'http_reqs': [
      'rate>100'      // Minimum 100 requests per second
    ],
    
    // Per-endpoint SLOs
    'http_req_duration{endpoint:health}': [
      'p(95)<100'     // Health checks must be very fast
    ],
    
    'http_req_duration{endpoint:login}': [
      'p(95)<400'     // Login SLO
    ],
    
    'http_req_duration{endpoint:articles_search}': [
      'p(95)<600'     // Search can be slightly slower
    ],
  },
  
  // Resource limits
  maxRedirects: 4,
  userAgent: 'k6-load-test/1.0',
  
  // Test environment
  ext: {
    loadimpact: {
      projectID: parseInt(__ENV.K6_PROJECT_ID || '0'),
      name: 'API Load Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Realistic test data
const SEARCH_QUERIES = [
  'technology', 'artificial intelligence', 'climate change', 'politics',
  'sports', 'business', 'health', 'science', 'education', 'entertainment',
  'machine learning', 'cryptocurrency', 'renewable energy', 'space exploration'
];

const USER_POOL = [
  { email: 'user1@example.com', password: 'password' },
  { email: 'user2@example.com', password: 'password' },
  { email: 'test@example.com', password: 'password' },
  { email: 'demo@example.com', password: 'password' },
  { email: 'testuser@example.com', password: 'password' }
];

export function setup() {
  // Pre-test validation
  console.log('🚀 Starting load test setup...');
  
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not ready. Health check failed with status ${healthCheck.status}`);
  }
  
  console.log('✅ API health check passed');
  console.log(`📡 Target: ${BASE_URL}`);
  console.log('🎯 Load test starting...');
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  // Simulate realistic user behavior patterns
  const userScenario = Math.random();
  
  if (userScenario < 0.4) {
    // 40% - Quick health check users (monitoring, load balancers)
    quickHealthCheckUser();
  } else if (userScenario < 0.7) {
    // 30% - Casual browsing users  
    casualBrowsingUser();
  } else if (userScenario < 0.9) {
    // 20% - Active search users
    activeSearchUser();
  } else {
    // 10% - Heavy users (multiple actions)
    heavyUser();
  }
  
  // Random think time between actions
  sleep(randomIntBetween(1, 3));
}

function quickHealthCheckUser() {
  const response = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health', scenario: 'quick_check' }
  });
  
  totalRequests.add(1);
  
  const success = check(response, {
    'health check successful': (r) => r.status === 200,
    'health response fast': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
}

function casualBrowsingUser() {
  // Health check
  http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health', scenario: 'casual' }
  });
  
  sleep(0.5);
  
  // Browse articles without auth
  const query = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];
  const searchStart = Date.now();
  
  const searchResponse = http.get(`${BASE_URL}/api/v1/articles/search?q=${encodeURIComponent(query)}`, {
    tags: { endpoint: 'articles_search', scenario: 'casual' }
  });
  
  const searchTime = Date.now() - searchStart;
  searchLatency.add(searchTime);
  totalRequests.add(2);
  
  const searchSuccess = check(searchResponse, {
    'search successful': (r) => r.status === 200,
    'search returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'OK';
      } catch (e) {
        return false;
      }
    }
  });
  
  errorRate.add(!searchSuccess);
}

function activeSearchUser() {
  // Authenticate first
  const user = USER_POOL[randomIntBetween(0, USER_POOL.length - 1)];
  const authStart = Date.now();
  
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, 
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login', scenario: 'active' }
    }
  );
  
  const authTime = Date.now() - authStart;
  authLatency.add(authTime);
  
  const authSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken && body.accessToken.length > 0;
      } catch (e) {
        return false;
      }
    }
  });
  
  authSuccessRate.add(authSuccess);
  totalRequests.add(1);
  
  if (!authSuccess) {
    authFailures.add(1);
    errorRate.add(true);
    return;
  }
  
  // Extract token
  let token = '';
  try {
    const body = JSON.parse(loginResponse.body);
    token = body.accessToken;
  } catch (e) {
    errorRate.add(true);
    return;
  }
  
  sleep(0.2);
  
  // Perform multiple searches
  for (let i = 0; i < randomIntBetween(2, 5); i++) {
    const query = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];
    const searchStart = Date.now();
    
    const searchResponse = http.get(`${BASE_URL}/api/v1/articles/search?q=${encodeURIComponent(query)}`, {
      tags: { endpoint: 'articles_search', scenario: 'active' }
    });
    
    const searchTime = Date.now() - searchStart;
    searchLatency.add(searchTime);
    totalRequests.add(1);
    
    const searchSuccess = check(searchResponse, {
      'authenticated search successful': (r) => r.status === 200
    });
    
    errorRate.add(!searchSuccess);
    
    sleep(randomIntBetween(1, 2));
  }
  
  // Access protected endpoint
  const protectedResponse = http.get(`${BASE_URL}/api/v1/protected`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'protected', scenario: 'active' }
  });
  
  totalRequests.add(1);
  
  const protectedSuccess = check(protectedResponse, {
    'protected endpoint accessible': (r) => r.status === 200
  });
  
  errorRate.add(!protectedSuccess);
}

function heavyUser() {
  // Heavy users do everything: auth + multiple searches + protected endpoints
  const user = USER_POOL[randomIntBetween(0, USER_POOL.length - 1)];
  
  // Login
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, 
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login', scenario: 'heavy' }
    }
  );
  
  totalRequests.add(1);
  
  if (loginResponse.status !== 200) {
    errorRate.add(true);
    return;
  }
  
  let token = '';
  try {
    const body = JSON.parse(loginResponse.body);
    token = body.accessToken;
  } catch (e) {
    errorRate.add(true);
    return;
  }
  
  // Multiple rapid searches
  for (let i = 0; i < randomIntBetween(5, 10); i++) {
    const query = SEARCH_QUERIES[randomIntBetween(0, SEARCH_QUERIES.length - 1)];
    
    http.get(`${BASE_URL}/api/v1/articles/search?q=${encodeURIComponent(query)}`, {
      tags: { endpoint: 'articles_search', scenario: 'heavy' }
    });
    
    totalRequests.add(1);
    sleep(0.1);
  }
  
  // Multiple protected endpoint calls
  for (let i = 0; i < randomIntBetween(3, 6); i++) {
    const protectedResponse = http.get(`${BASE_URL}/api/v1/protected`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { endpoint: 'protected', scenario: 'heavy' }
    });
    
    totalRequests.add(1);
    
    const success = check(protectedResponse, {
      'heavy user protected access': (r) => r.status === 200
    });
    
    errorRate.add(!success);
    sleep(0.1);
  }
}

export function teardown(data) {
  console.log('🏁 Load test completed');
}

export function handleSummary(data) {
  // Comprehensive summary for CI/CD and monitoring
  const summary = {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
  
  // Detailed JSON report
  summary['load-test-results.json'] = JSON.stringify({
    timestamp: new Date().toISOString(),
    test_type: 'load',
    duration_minutes: 21, // Total test duration
    peak_users: 50,
    passed: data.metrics.checks.values.passes / data.metrics.checks.values.count >= 0.98,
    
    // Performance metrics
    performance: {
      http_req_duration_p95: Math.round(data.metrics.http_req_duration.values.p95),
      http_req_duration_p99: Math.round(data.metrics.http_req_duration.values.p99),
      http_req_duration_med: Math.round(data.metrics.http_req_duration.values.med),
      http_req_duration_avg: Math.round(data.metrics.http_req_duration.values.avg),
      requests_per_second: Math.round(data.metrics.http_reqs.values.rate),
    },
    
    // Reliability metrics
    reliability: {
      http_req_failed_rate: (data.metrics.http_req_failed.values.rate * 100).toFixed(2),
      error_rate: (data.metrics.error_rate.values.rate * 100).toFixed(2),
      auth_success_rate: (data.metrics.auth_success_rate.values.rate * 100).toFixed(2),
    },
    
    // Service-specific metrics
    services: {
      search_latency_p95: Math.round(data.metrics.search_latency.values.p95),
      auth_latency_p95: Math.round(data.metrics.auth_latency.values.p95),
    },
    
    // Throughput
    throughput: {
      total_requests: data.metrics.total_requests.values.count,
      auth_failures: data.metrics.auth_failures.values.count,
      requests_per_minute: Math.round(data.metrics.http_reqs.values.rate * 60),
    },
    
    // SLO compliance
    slo_compliance: {
      thresholds_passed: Object.keys(data.metrics).every(
        metric => data.metrics[metric].thresholds ? 
          Object.values(data.metrics[metric].thresholds).every(t => t.ok) : 
          true
      )
    }
  });
  
  return summary;
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  
  let output = '\n';
  output += `${indent}🚀 Load Test Summary\n`;
  output += `${indent}==================\n`;
  output += `${indent}📊 Checks: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.count} passed (${((data.metrics.checks.values.passes / data.metrics.checks.values.count) * 100).toFixed(1)}%)\n`;
  output += `${indent}⏱️  Response Time P95: ${Math.round(data.metrics.http_req_duration.values.p95)}ms\n`;
  output += `${indent}⏱️  Response Time P99: ${Math.round(data.metrics.http_req_duration.values.p99)}ms\n`;
  output += `${indent}⏱️  Response Time Med: ${Math.round(data.metrics.http_req_duration.values.med)}ms\n`;
  output += `${indent}📈 Requests/sec: ${Math.round(data.metrics.http_reqs.values.rate)}\n`;
  output += `${indent}❌ Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  output += `${indent}🔐 Auth Success: ${(data.metrics.auth_success_rate.values.rate * 100).toFixed(1)}%\n`;
  output += `${indent}🔍 Search Latency P95: ${Math.round(data.metrics.search_latency.values.p95)}ms\n`;
  
  return output;
}