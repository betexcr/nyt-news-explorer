import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Smoke Test - Quick validation that API is working
 * Runs with minimal load to catch obvious regressions
 */

// Custom metrics
const errorRate = new Rate('error_rate');
const authLatency = new Trend('auth_latency', true);

// SLO thresholds - build fails if these are not met
export const options = {
  // Minimal load for smoke test
  vus: 1,
  duration: '30s',
  
  // SLO gates - critical thresholds that must pass
  thresholds: {
    // Response time SLOs
    'http_req_duration': [
      'p(95)<350',    // 95% of requests must complete within 350ms
      'p(99)<500',    // 99% of requests must complete within 500ms
      'med<100'       // Median response time under 100ms
    ],
    
    // Error rate SLOs  
    'http_req_failed': [
      'rate<0.01'     // Less than 1% error rate
    ],
    
    // Custom metrics
    'error_rate': [
      'rate<0.01'     // Less than 1% custom error rate
    ],
    
    'auth_latency': [
      'p(95)<200'     // Authentication should be fast
    ],
    
    // HTTP status codes
    'http_req_duration{status:200}': [
      'p(95)<300'     // Successful requests even faster
    ]
  },
  
  // Test stages
  stages: [
    { duration: '10s', target: 1 },  // Warmup
    { duration: '20s', target: 1 },  // Steady state
  ]
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'password'
};

export default function() {
  // Test 1: Health check
  const healthResponse = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health' }
  });
  
  const healthCheck = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
    'health has status field': (r) => JSON.parse(r.body).status === 'healthy',
    'health has version': (r) => JSON.parse(r.body).version !== undefined,
  });
  
  errorRate.add(!healthCheck);
  
  sleep(0.1);

  // Test 2: API health check  
  const apiHealthResponse = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { endpoint: 'api_health' }
  });
  
  check(apiHealthResponse, {
    'api health status is 200': (r) => r.status === 200,
    'api health has environment': (r) => JSON.parse(r.body).environment !== undefined,
  });
  
  sleep(0.1);

  // Test 3: Authentication flow
  const authStart = Date.now();
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, 
    JSON.stringify(TEST_USER), 
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' }
    }
  );
  
  const authTime = Date.now() - authStart;
  authLatency.add(authTime);
  
  const authCheck = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken && body.accessToken.length > 0;
      } catch (e) {
        return false;
      }
    },
    'login returns user info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.email === TEST_USER.email;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!authCheck);
  
  // Extract token for protected endpoint test
  let token = '';
  if (loginResponse.status === 200) {
    try {
      const loginBody = JSON.parse(loginResponse.body);
      token = loginBody.accessToken;
    } catch (e) {
      console.error('Failed to parse login response:', e);
    }
  }
  
  sleep(0.1);

  // Test 4: Protected endpoint
  if (token) {
    const protectedResponse = http.get(`${BASE_URL}/api/v1/protected`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { endpoint: 'protected' }
    });
    
    const protectedCheck = check(protectedResponse, {
      'protected status is 200': (r) => r.status === 200,
      'protected returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.id !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
    
    errorRate.add(!protectedCheck);
    
    sleep(0.1);
  }

  // Test 5: Articles search  
  const searchResponse = http.get(`${BASE_URL}/api/v1/articles/search?q=technology`, {
    tags: { endpoint: 'articles_search' }
  });
  
  const searchCheck = check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search returns articles': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'OK' && body.response && body.response.docs;
      } catch (e) {
        return false;
      }
    },
    'search response time reasonable': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!searchCheck);
  
  sleep(0.1);

  // Test 6: Invalid endpoint (404 handling)
  const notFoundResponse = http.get(`${BASE_URL}/api/v1/nonexistent`, {
    tags: { endpoint: 'not_found' }
  });
  
  check(notFoundResponse, {
    'not found returns 404': (r) => r.status === 404,
    '404 response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  sleep(0.1);
}

export function handleSummary(data) {
  // Custom summary for CI/CD integration
  const summary = {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
  
  // Add JSON output for automated parsing
  summary['smoke-test-results.json'] = JSON.stringify({
    timestamp: new Date().toISOString(),
    test_type: 'smoke',
    passed: data.metrics.checks.values.passes / data.metrics.checks.values.count >= 0.99,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration.values.p95,
      http_req_duration_p99: data.metrics.http_req_duration.values.p99,
      http_req_duration_med: data.metrics.http_req_duration.values.med,
      http_req_failed_rate: data.metrics.http_req_failed.values.rate,
      error_rate: data.metrics.error_rate.values.rate,
      auth_latency_p95: data.metrics.auth_latency.values.p95,
    },
    thresholds_passed: Object.keys(data.metrics).every(
      metric => data.metrics[metric].thresholds ? 
        Object.values(data.metrics[metric].thresholds).every(t => t.ok) : 
        true
    )
  });
  
  return summary;
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;
  
  let output = '\n';
  output += `${indent}✅ Smoke Test Summary\n`;
  output += `${indent}==================\n`;
  output += `${indent}📊 Checks: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.count} passed\n`;
  output += `${indent}⏱️  Response Time P95: ${Math.round(data.metrics.http_req_duration.values.p95)}ms\n`;
  output += `${indent}⏱️  Response Time P99: ${Math.round(data.metrics.http_req_duration.values.p99)}ms\n`;
  output += `${indent}❌ Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  output += `${indent}🔐 Auth Latency P95: ${Math.round(data.metrics.auth_latency.values.p95)}ms\n`;
  
  return output;
}