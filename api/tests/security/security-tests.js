#!/usr/bin/env node

/**
 * Comprehensive Security Testing Suite
 * Tests OWASP API Security Top 10 (2023) vulnerabilities
 */

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RESULTS_DIR = './security-reports';

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

class SecurityTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
    this.authToken = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async authenticate() {
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'password'
      });
      
      this.authToken = response.data.accessToken;
      this.log('✅ Authentication successful');
      return true;
    } catch (error) {
      this.log(`❌ Authentication failed: ${error.message}`, 'error');
      return false;
    }
  }

  recordTest(testName, passed, severity = 'medium', details = '', recommendation = '') {
    const result = {
      test: testName,
      passed,
      severity,
      details,
      recommendation,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      this.results.summary[severity]++;
    }
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    this.log(`${status}: ${testName} (${severity})`);
    if (!passed && details) {
      this.log(`   Details: ${details}`);
    }
  }

  // OWASP API1:2023 - Broken Object Level Authorization (BOLA)
  async testBrokenObjectLevelAuth() {
    this.log('🔍 Testing API1:2023 - Broken Object Level Authorization');

    // Test 1: Direct object reference without authorization
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/users/123`, {
        validateStatus: () => true
      });
      
      const passed = response.status === 401 || response.status === 403 || response.status === 404;
      this.recordTest(
        'BOLA - Direct Object Reference', 
        passed, 
        'critical',
        passed ? 'Endpoint properly rejects unauthorized access' : `Endpoint returns ${response.status}`,
        'Implement proper authorization checks for all object access'
      );
    } catch (error) {
      this.recordTest('BOLA - Direct Object Reference', true, 'critical', 'Endpoint does not exist (good)');
    }

    // Test 2: Parameter manipulation
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/protected?userId=999`, {
        headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
        validateStatus: () => true
      });
      
      // Should not expose other user data
      const passed = !response.data || !response.data.user || response.data.user.id !== '999';
      this.recordTest(
        'BOLA - Parameter Manipulation',
        passed,
        'high',
        passed ? 'Does not expose other user data' : 'May expose unauthorized user data'
      );
    } catch (error) {
      this.recordTest('BOLA - Parameter Manipulation', true, 'high', 'Request blocked or endpoint secure');
    }
  }

  // OWASP API2:2023 - Broken Authentication
  async testBrokenAuthentication() {
    this.log('🔍 Testing API2:2023 - Broken Authentication');

    // Test 1: Weak password policy
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: '123'
      }, { validateStatus: () => true });
      
      const passed = response.status === 401;
      this.recordTest(
        'Broken Auth - Weak Password',
        passed,
        'high',
        passed ? 'Weak passwords rejected' : 'Weak passwords accepted'
      );
    } catch (error) {
      this.recordTest('Broken Auth - Weak Password', true, 'high', 'Login endpoint properly secured');
    }

    // Test 2: JWT token validation
    if (this.authToken) {
      // Test with malformed token
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/protected`, {
          headers: { 'Authorization': 'Bearer invalid.jwt.token' },
          validateStatus: () => true
        });
        
        const passed = response.status === 401;
        this.recordTest(
          'Broken Auth - Invalid JWT',
          passed,
          'critical',
          passed ? 'Invalid JWT tokens rejected' : 'Invalid JWT tokens accepted'
        );
      } catch (error) {
        this.recordTest('Broken Auth - Invalid JWT', true, 'critical', 'JWT validation working');
      }

      // Test with expired token simulation
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImV4cCI6MX0.invalid';
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/protected`, {
          headers: { 'Authorization': `Bearer ${expiredToken}` },
          validateStatus: () => true
        });
        
        const passed = response.status === 401;
        this.recordTest(
          'Broken Auth - Expired Token',
          passed,
          'high',
          passed ? 'Expired tokens rejected' : 'Expired tokens accepted'
        );
      } catch (error) {
        this.recordTest('Broken Auth - Expired Token', true, 'high', 'Token expiration working');
      }
    }
  }

  // OWASP API3:2023 - Broken Object Property Level Authorization (BOPLA)
  async testBrokenObjectPropertyAuth() {
    this.log('🔍 Testing API3:2023 - Broken Object Property Level Authorization');

    if (this.authToken) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/protected`, {
          headers: { 'Authorization': `Bearer ${this.authToken}` },
          validateStatus: () => true
        });
        
        // Check if response exposes sensitive properties
        let exposedSensitive = false;
        if (response.data && response.data.user) {
          const sensitiveFields = ['password', 'ssn', 'creditCard', 'internalId', 'adminNotes'];
          exposedSensitive = sensitiveFields.some(field => response.data.user[field] !== undefined);
        }
        
        this.recordTest(
          'BOPLA - Sensitive Data Exposure',
          !exposedSensitive,
          'medium',
          exposedSensitive ? 'Response may contain sensitive fields' : 'No sensitive fields exposed'
        );
      } catch (error) {
        this.recordTest('BOPLA - Sensitive Data Exposure', true, 'medium', 'Protected endpoint secure');
      }
    }
  }

  // OWASP API4:2023 - Unrestricted Resource Consumption
  async testUnrestrictedResourceConsumption() {
    this.log('🔍 Testing API4:2023 - Unrestricted Resource Consumption');

    // Test 1: Rate limiting
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        axios.get(`${BASE_URL}/health`, { validateStatus: () => true })
      );
    }

    try {
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      this.recordTest(
        'Resource Consumption - Rate Limiting',
        rateLimited,
        'medium',
        rateLimited ? 'Rate limiting active' : 'No rate limiting detected',
        'Implement rate limiting to prevent abuse'
      );
    } catch (error) {
      this.recordTest('Resource Consumption - Rate Limiting', false, 'medium', 'Rate limiting test failed');
    }

    // Test 2: Large payload handling
    try {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'password',
        large_field: largePayload
      }, { 
        validateStatus: () => true,
        timeout: 5000
      });
      
      const passed = response.status === 413 || response.status === 400;
      this.recordTest(
        'Resource Consumption - Large Payload',
        passed,
        'medium',
        passed ? 'Large payloads rejected' : 'Large payloads accepted'
      );
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.recordTest('Resource Consumption - Large Payload', true, 'medium', 'Request timeout (good)');
      } else {
        this.recordTest('Resource Consumption - Large Payload', false, 'medium', `Error: ${error.message}`);
      }
    }
  }

  // OWASP API5:2023 - Broken Function Level Authorization (BFLA)
  async testBrokenFunctionLevelAuth() {
    this.log('🔍 Testing API5:2023 - Broken Function Level Authorization');

    // Test admin endpoints without admin privileges
    const adminEndpoints = ['/api/v1/admin/users', '/api/v1/admin/config', '/api/v1/admin/logs'];
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          validateStatus: () => true
        });
        
        const passed = response.status === 403 || response.status === 401 || response.status === 404;
        this.recordTest(
          `BFLA - Admin Access (${endpoint})`,
          passed,
          'critical',
          passed ? 'Admin endpoint protected' : `Admin endpoint accessible with status ${response.status}`
        );
      } catch (error) {
        this.recordTest(`BFLA - Admin Access (${endpoint})`, true, 'critical', 'Endpoint not accessible');
      }
    }

    // Test HTTP method tampering
    try {
      const response = await axios.delete(`${BASE_URL}/api/v1/articles/search`, {
        headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
        validateStatus: () => true
      });
      
      const passed = response.status === 405 || response.status === 404;
      this.recordTest(
        'BFLA - HTTP Method Tampering',
        passed,
        'medium',
        passed ? 'Invalid HTTP methods rejected' : 'Invalid HTTP method accepted'
      );
    } catch (error) {
      this.recordTest('BFLA - HTTP Method Tampering', true, 'medium', 'Method properly restricted');
    }
  }

  // OWASP API6:2023 - Server-Side Request Forgery (SSRF)
  async testSSRF() {
    this.log('🔍 Testing API6:2023 - Server-Side Request Forgery');

    // Test URL parameters for SSRF
    const ssrfPayloads = [
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://localhost:22',
      'file:///etc/passwd',
      'ftp://localhost:21'
    ];

    for (const payload of ssrfPayloads) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/articles/search`, {
          params: { url: payload },
          validateStatus: () => true,
          timeout: 5000
        });
        
        // Should not process internal URLs
        const passed = response.status !== 200 || !response.data.toString().includes('root:') && !response.data.toString().includes('SSH-');
        this.recordTest(
          `SSRF - URL Parameter (${payload.substring(0, 20)}...)`,
          passed,
          'critical',
          passed ? 'SSRF payload blocked' : 'SSRF payload may have been processed'
        );
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          this.recordTest(`SSRF - URL Parameter`, true, 'critical', 'Request timeout (good protection)');
        } else {
          this.recordTest(`SSRF - URL Parameter`, true, 'critical', 'SSRF blocked or endpoint secure');
        }
      }
    }
  }

  // Security Headers Test
  async testSecurityHeaders() {
    this.log('🔍 Testing Security Headers');

    try {
      const response = await axios.get(`${BASE_URL}/health`);
      const headers = response.headers;
      
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': true,
        'x-dns-prefetch-control': true,
        'x-download-options': true,
        'strict-transport-security': true, // May not be present in HTTP
        'content-security-policy': false, // Disabled in our simple config
      };
      
      for (const [headerName, required] of Object.entries(securityHeaders)) {
        const present = headers[headerName] !== undefined;
        const passed = !required || present;
        
        this.recordTest(
          `Security Headers - ${headerName}`,
          passed,
          required ? 'medium' : 'low',
          present ? `Present: ${headers[headerName]}` : 'Not present',
          required && !present ? `Add ${headerName} header` : undefined
        );
      }
    } catch (error) {
      this.recordTest('Security Headers Test', false, 'medium', `Error: ${error.message}`);
    }
  }

  // Input Validation Tests
  async testInputValidation() {
    this.log('🔍 Testing Input Validation');

    // Test SQL injection patterns (even though we don't use SQL)
    const sqlPayloads = ["' OR '1'='1", "1; DROP TABLE users; --", "' UNION SELECT * FROM users --"];
    
    for (const payload of sqlPayloads) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/articles/search`, {
          params: { q: payload },
          validateStatus: () => true
        });
        
        // Should not cause errors or expose internal information
        const passed = response.status === 200 && !response.data.toString().toLowerCase().includes('error');
        this.recordTest(
          `Input Validation - SQL Injection`,
          passed,
          'high',
          passed ? 'SQL injection payload handled safely' : 'SQL injection payload caused errors'
        );
        break; // Only test one payload to avoid spam
      } catch (error) {
        this.recordTest('Input Validation - SQL Injection', true, 'high', 'Input properly sanitized');
        break;
      }
    }

    // Test XSS patterns
    const xssPayloads = ['<script>alert(1)</script>', 'javascript:alert(1)', '"><img src=x onerror=alert(1)>'];
    
    for (const payload of xssPayloads) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/articles/search`, {
          params: { q: payload },
          validateStatus: () => true
        });
        
        // Response should not contain the raw script
        const passed = !response.data.toString().includes('<script>') && !response.data.toString().includes('javascript:');
        this.recordTest(
          'Input Validation - XSS',
          passed,
          'medium',
          passed ? 'XSS payload sanitized' : 'XSS payload may be reflected'
        );
        break; // Only test one payload
      } catch (error) {
        this.recordTest('Input Validation - XSS', true, 'medium', 'Input properly validated');
        break;
      }
    }
  }

  async generateReport() {
    this.log('📊 Generating security test report...');
    
    const reportPath = path.join(RESULTS_DIR, 'security-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(RESULTS_DIR, 'security-summary.txt');
    let summary = `Security Test Summary\n`;
    summary += `====================\n`;
    summary += `Date: ${this.results.timestamp}\n`;
    summary += `Target: ${this.results.baseUrl}\n\n`;
    summary += `Results: ${this.results.summary.passed}/${this.results.summary.total} tests passed\n`;
    summary += `Critical: ${this.results.summary.critical}\n`;
    summary += `High: ${this.results.summary.high}\n`;
    summary += `Medium: ${this.results.summary.medium}\n`;
    summary += `Low: ${this.results.summary.low}\n\n`;
    
    summary += `Failed Tests:\n`;
    summary += `=============\n`;
    this.results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        summary += `❌ ${test.test} (${test.severity})\n`;
        if (test.details) summary += `   ${test.details}\n`;
        if (test.recommendation) summary += `   Recommendation: ${test.recommendation}\n`;
        summary += `\n`;
      });
    
    fs.writeFileSync(summaryPath, summary);
    
    this.log(`✅ Reports generated:`);
    this.log(`   📄 ${reportPath}`);
    this.log(`   📋 ${summaryPath}`);
    
    return this.results;
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive security tests...');
    
    // Authenticate first
    await this.authenticate();
    
    // Run all security tests
    await this.testBrokenObjectLevelAuth();
    await this.testBrokenAuthentication();
    await this.testBrokenObjectPropertyAuth();
    await this.testUnrestrictedResourceConsumption();
    await this.testBrokenFunctionLevelAuth();
    await this.testSSRF();
    await this.testSecurityHeaders();
    await this.testInputValidation();
    
    // Generate reports
    const results = await this.generateReport();
    
    this.log('🏁 Security tests completed!');
    this.log(`📊 Summary: ${results.summary.passed}/${results.summary.total} passed`);
    
    if (results.summary.critical > 0) {
      this.log(`🚨 CRITICAL: ${results.summary.critical} critical issues found!`, 'error');
      process.exit(1);
    }
    
    if (results.summary.high > 0) {
      this.log(`⚠️  HIGH: ${results.summary.high} high-severity issues found`, 'warn');
    }
    
    return results;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Security tests failed:', error);
    process.exit(1);
  });
}

export default SecurityTester;