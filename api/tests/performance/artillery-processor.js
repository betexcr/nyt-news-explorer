/**
 * Artillery Custom Processor
 * Handles custom metrics, business logic validation, and advanced reporting
 */

const fs = require('fs');
const path = require('path');

// Custom metrics tracking
const customMetrics = {
  authenticationLatency: [],
  searchResponseTimes: [],
  errorsByEndpoint: new Map(),
  businessLogicErrors: 0,
  concurrentUsers: 0,
  peakConcurrentUsers: 0
};

// Business logic validation
function validateBusinessLogic(requestParams, response, context) {
  try {
    const body = typeof response.body === 'string' 
      ? JSON.parse(response.body) 
      : response.body;

    // Validate authentication responses
    if (requestParams.url.includes('/auth/login')) {
      if (response.statusCode === 200) {
        if (!body.accessToken || !body.user) {
          customMetrics.businessLogicErrors++;
          return false;
        }
        
        // Validate JWT format
        const tokenParts = body.accessToken.split('.');
        if (tokenParts.length !== 3) {
          customMetrics.businessLogicErrors++;
          return false;
        }
      }
    }

    // Validate search responses
    if (requestParams.url.includes('/articles/search')) {
      if (response.statusCode === 200) {
        if (!body.response || !body.response.docs || !Array.isArray(body.response.docs)) {
          customMetrics.businessLogicErrors++;
          return false;
        }
        
        // Validate article structure
        body.response.docs.forEach(article => {
          if (!article._id || !article.headline || !article.pub_date) {
            customMetrics.businessLogicErrors++;
            return false;
          }
        });
      }
    }

    // Validate protected endpoint responses
    if (requestParams.url.includes('/protected')) {
      if (response.statusCode === 200) {
        if (!body.user || !body.message) {
          customMetrics.businessLogicErrors++;
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    customMetrics.businessLogicErrors++;
    return false;
  }
}

// Track error patterns
function trackErrors(requestParams, response) {
  if (response.statusCode >= 400) {
    const endpoint = getEndpointName(requestParams.url);
    const currentCount = customMetrics.errorsByEndpoint.get(endpoint) || 0;
    customMetrics.errorsByEndpoint.set(endpoint, currentCount + 1);
  }
}

// Extract endpoint name for metrics
function getEndpointName(url) {
  if (url.includes('/health')) return 'health';
  if (url.includes('/auth/login')) return 'auth_login';
  if (url.includes('/protected')) return 'protected';
  if (url.includes('/articles/search')) return 'articles_search';
  return 'other';
}

// Generate correlation ID for request tracing
function generateCorrelationId() {
  return `artillery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Pre-request hook - runs before each request
function preRequest(requestParams, context, ee, next) {
  // Add correlation ID to all requests
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Correlation-ID'] = generateCorrelationId();
  
  // Track concurrent users
  customMetrics.concurrentUsers++;
  if (customMetrics.concurrentUsers > customMetrics.peakConcurrentUsers) {
    customMetrics.peakConcurrentUsers = customMetrics.concurrentUsers;
  }
  
  // Add custom timing for authentication requests
  if (requestParams.url.includes('/auth/login')) {
    context.vars._authStartTime = Date.now();
  }
  
  // Add custom timing for search requests
  if (requestParams.url.includes('/articles/search')) {
    context.vars._searchStartTime = Date.now();
  }
  
  return next();
}

// Post-response hook - runs after each response
function postResponse(requestParams, response, context, ee, next) {
  // Track concurrent users
  customMetrics.concurrentUsers--;
  
  // Custom authentication latency tracking
  if (requestParams.url.includes('/auth/login') && context.vars._authStartTime) {
    const latency = Date.now() - context.vars._authStartTime;
    customMetrics.authenticationLatency.push(latency);
    delete context.vars._authStartTime;
  }
  
  // Custom search response time tracking
  if (requestParams.url.includes('/articles/search') && context.vars._searchStartTime) {
    const responseTime = Date.now() - context.vars._searchStartTime;
    customMetrics.searchResponseTimes.push(responseTime);
    delete context.vars._searchStartTime;
  }
  
  // Validate business logic
  const isValid = validateBusinessLogic(requestParams, response, context);
  
  // Track errors by endpoint
  trackErrors(requestParams, response);
  
  // Log critical errors for investigation
  if (response.statusCode >= 500) {
    console.error(`🚨 Server error: ${response.statusCode} on ${requestParams.url}`);
  }
  
  // Emit custom metrics
  ee.emit('counter', 'business_logic_errors', customMetrics.businessLogicErrors);
  ee.emit('histogram', 'custom_auth_latency', 
    customMetrics.authenticationLatency[customMetrics.authenticationLatency.length - 1] || 0);
  ee.emit('histogram', 'custom_search_response_time',
    customMetrics.searchResponseTimes[customMetrics.searchResponseTimes.length - 1] || 0);
  
  return next();
}

// Test completion hook - generate final report
function testCompleted(stats, done) {
  console.log('\n📊 Generating custom performance report...');
  
  // Calculate custom statistics
  const authLatencyStats = calculateStats(customMetrics.authenticationLatency);
  const searchLatencyStats = calculateStats(customMetrics.searchResponseTimes);
  
  // Generate comprehensive report
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'artillery-load-test',
    summary: {
      totalRequests: stats.aggregate.counters['http.requests'] || 0,
      totalErrors: stats.aggregate.counters['http.request_rate'] || 0,
      testDuration: stats.aggregate.duration || 0,
      peakConcurrentUsers: customMetrics.peakConcurrentUsers,
    },
    customMetrics: {
      businessLogicErrors: customMetrics.businessLogicErrors,
      authenticationLatency: authLatencyStats,
      searchResponseTimes: searchLatencyStats,
      errorsByEndpoint: Object.fromEntries(customMetrics.errorsByEndpoint),
    },
    sloCompliance: {
      authLatencyP95: authLatencyStats.p95 < 300,
      searchLatencyP95: searchLatencyStats.p95 < 500,
      overallErrorRate: ((stats.aggregate.counters['http.errors'] || 0) / 
                        (stats.aggregate.counters['http.requests'] || 1)) < 0.02,
    },
    recommendations: generateRecommendations(authLatencyStats, searchLatencyStats)
  };
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'artillery-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Custom report generated:', reportPath);
  console.log(`📈 Peak concurrent users: ${customMetrics.peakConcurrentUsers}`);
  console.log(`🔐 Auth P95 latency: ${authLatencyStats.p95}ms`);
  console.log(`🔍 Search P95 latency: ${searchLatencyStats.p95}ms`);
  console.log(`❌ Business logic errors: ${customMetrics.businessLogicErrors}`);
  
  return done();
}

// Calculate statistics for an array of values
function calculateStats(values) {
  if (values.length === 0) {
    return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }
  
  const sorted = values.slice().sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    count,
    avg: Math.round(sum / count),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)]
  };
}

// Generate performance recommendations based on results
function generateRecommendations(authStats, searchStats) {
  const recommendations = [];
  
  if (authStats.p95 > 300) {
    recommendations.push('Authentication P95 latency exceeds 300ms. Consider optimizing JWT generation or database queries.');
  }
  
  if (searchStats.p95 > 500) {
    recommendations.push('Search P95 latency exceeds 500ms. Consider adding caching or optimizing search algorithms.');
  }
  
  if (customMetrics.businessLogicErrors > 0) {
    recommendations.push(`Found ${customMetrics.businessLogicErrors} business logic errors. Review response validation.`);
  }
  
  // Check for error hotspots
  for (const [endpoint, errorCount] of customMetrics.errorsByEndpoint) {
    if (errorCount > 10) {
      recommendations.push(`High error count (${errorCount}) on ${endpoint} endpoint. Investigate error patterns.`);
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All performance metrics within acceptable ranges. Good job! 🎉');
  }
  
  return recommendations;
}

// Export hooks for Artillery
module.exports = {
  preRequest,
  postResponse,
  testCompleted
};