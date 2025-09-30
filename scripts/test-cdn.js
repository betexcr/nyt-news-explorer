#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * CDN Testing Script
 * Tests CDN performance, caching, and optimization features
 */

const TEST_URL = 'https://nyt.brainvaultdev.com';
const LOCAL_URL = 'http://localhost:3000';

// Test configuration
const TESTS = {
  performance: true,
  caching: true,
  compression: true,
  security: true,
  images: true
};

console.log('🧪 Starting CDN tests...\n');

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'CDN-Test-Script/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ response: res, data }));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Test performance metrics
async function testPerformance(url) {
  console.log('⚡ Testing performance...');
  
  const startTime = Date.now();
  const { response, data } = await makeRequest(url);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  const contentLength = response.headers['content-length'] || data.length;
  
  console.log(`  Response time: ${responseTime}ms`);
  console.log(`  Content length: ${(contentLength / 1024).toFixed(2)} KB`);
  console.log(`  Status: ${response.statusCode}`);
  
  // Performance thresholds
  const isGood = responseTime < 1000 && response.statusCode === 200;
  console.log(`  Performance: ${isGood ? '✅ Good' : '❌ Needs improvement'}\n`);
  
  return { responseTime, contentLength, status: response.statusCode };
}

// Test caching headers
async function testCaching(url) {
  console.log('💾 Testing caching...');
  
  const { response } = await makeRequest(url);
  const cacheControl = response.headers['cache-control'];
  const etag = response.headers['etag'];
  const lastModified = response.headers['last-modified'];
  
  console.log(`  Cache-Control: ${cacheControl || 'Not set'}`);
  console.log(`  ETag: ${etag ? 'Present' : 'Not set'}`);
  console.log(`  Last-Modified: ${lastModified ? 'Present' : 'Not set'}`);
  
  // Test cache hit
  if (etag) {
    const { response: cachedResponse } = await makeRequest(url, {
      headers: { 'If-None-Match': etag }
    });
    console.log(`  Cache hit test: ${cachedResponse.statusCode === 304 ? '✅ Working' : '❌ Not working'}`);
  }
  
  const hasCaching = cacheControl && (cacheControl.includes('max-age') || cacheControl.includes('public'));
  console.log(`  Caching: ${hasCaching ? '✅ Configured' : '❌ Not configured'}\n`);
  
  return { cacheControl, etag, lastModified, hasCaching };
}

// Test compression
async function testCompression(url) {
  console.log('🗜️  Testing compression...');
  
  // Test with compression
  const { response: compressedResponse, data: compressedData } = await makeRequest(url);
  const compressedLength = compressedData.length;
  
  // Test without compression
  const { response: uncompressedResponse, data: uncompressedData } = await makeRequest(url, {
    headers: { 'Accept-Encoding': 'identity' }
  });
  const uncompressedLength = uncompressedData.length;
  
  const compressionRatio = ((uncompressedLength - compressedLength) / uncompressedLength * 100).toFixed(1);
  const contentEncoding = compressedResponse.headers['content-encoding'];
  
  console.log(`  Compressed size: ${(compressedLength / 1024).toFixed(2)} KB`);
  console.log(`  Uncompressed size: ${(uncompressedLength / 1024).toFixed(2)} KB`);
  console.log(`  Compression ratio: ${compressionRatio}%`);
  console.log(`  Content-Encoding: ${contentEncoding || 'None'}`);
  
  const isCompressed = contentEncoding && compressionRatio > 10;
  console.log(`  Compression: ${isCompressed ? '✅ Working' : '❌ Not working'}\n`);
  
  return { compressionRatio, contentEncoding, isCompressed };
}

// Test security headers
async function testSecurity(url) {
  console.log('🔒 Testing security headers...');
  
  const { response } = await makeRequest(url);
  const securityHeaders = {
    'x-content-type-options': response.headers['x-content-type-options'],
    'x-frame-options': response.headers['x-frame-options'],
    'x-xss-protection': response.headers['x-xss-protection'],
    'strict-transport-security': response.headers['strict-transport-security'],
    'referrer-policy': response.headers['referrer-policy'],
    'permissions-policy': response.headers['permissions-policy']
  };
  
  let securityScore = 0;
  const totalHeaders = Object.keys(securityHeaders).length;
  
  Object.entries(securityHeaders).forEach(([header, value]) => {
    const isPresent = value && value !== 'undefined';
    console.log(`  ${header}: ${isPresent ? value : 'Not set'}`);
    if (isPresent) securityScore++;
  });
  
  const securityPercentage = (securityScore / totalHeaders * 100).toFixed(1);
  console.log(`  Security score: ${securityScore}/${totalHeaders} (${securityPercentage}%)`);
  console.log(`  Security: ${securityPercentage >= 80 ? '✅ Good' : '❌ Needs improvement'}\n`);
  
  return { securityScore, totalHeaders, securityPercentage };
}

// Test image optimization
async function testImages(url) {
  console.log('🖼️  Testing image optimization...');
  
  const imageTests = [
    '/logo.png',
    '/logo.webp',
    '/home-hero-800.jpg',
    '/home-hero-800.webp',
    '/home-hero-800.avif'
  ];
  
  const results = [];
  
  for (const imagePath of imageTests) {
    try {
      const imageUrl = `${url}${imagePath}`;
      const { response, data } = await makeRequest(imageUrl);
      
      if (response.statusCode === 200) {
        const size = (data.length / 1024).toFixed(2);
        const contentType = response.headers['content-type'];
        const cacheControl = response.headers['cache-control'];
        
        console.log(`  ${imagePath}: ${size} KB (${contentType})`);
        results.push({ path: imagePath, size: parseFloat(size), contentType, cached: !!cacheControl });
      } else {
        console.log(`  ${imagePath}: ❌ Not found (${response.statusCode})`);
      }
    } catch (error) {
      console.log(`  ${imagePath}: ❌ Error - ${error.message}`);
    }
  }
  
  const optimizedImages = results.filter(r => r.contentType.includes('webp') || r.contentType.includes('avif'));
  console.log(`  Image optimization: ${optimizedImages.length > 0 ? '✅ Working' : '❌ Not configured'}\n`);
  
  return results;
}

// Test static assets
async function testStaticAssets(url) {
  console.log('📦 Testing static assets...');
  
  const staticAssets = [
    '/static/css/main.css',
    '/static/js/main.js',
    '/manifest.json',
    '/robots.txt'
  ];
  
  const results = [];
  
  for (const assetPath of staticAssets) {
    try {
      const assetUrl = `${url}${assetPath}`;
      const { response, data } = await makeRequest(assetUrl);
      
      if (response.statusCode === 200) {
        const size = (data.length / 1024).toFixed(2);
        const cacheControl = response.headers['cache-control'];
        const immutable = cacheControl && cacheControl.includes('immutable');
        
        console.log(`  ${assetPath}: ${size} KB ${immutable ? '(immutable)' : ''}`);
        results.push({ path: assetPath, size: parseFloat(size), immutable });
      } else {
        console.log(`  ${assetPath}: ❌ Not found (${response.statusCode})`);
      }
    } catch (error) {
      console.log(`  ${assetPath}: ❌ Error - ${error.message}`);
    }
  }
  
  const immutableAssets = results.filter(r => r.immutable);
  console.log(`  Static assets: ${immutableAssets.length > 0 ? '✅ Optimized' : '❌ Not optimized'}\n`);
  
  return results;
}

// Generate test report
function generateReport(results) {
  console.log('📊 CDN Test Report');
  console.log('==================\n');
  
  const { performance, caching, compression, security, images, staticAssets } = results;
  
  console.log('Performance:');
  console.log(`  Response time: ${performance.responseTime}ms ${performance.responseTime < 1000 ? '✅' : '❌'}`);
  console.log(`  Content size: ${(performance.contentLength / 1024).toFixed(2)} KB\n`);
  
  console.log('Caching:');
  console.log(`  Cache headers: ${caching.hasCaching ? '✅' : '❌'}`);
  console.log(`  ETag support: ${caching.etag ? '✅' : '❌'}\n`);
  
  console.log('Compression:');
  console.log(`  Compression ratio: ${compression.compressionRatio}% ${compression.isCompressed ? '✅' : '❌'}`);
  console.log(`  Content encoding: ${compression.contentEncoding || 'None'}\n`);
  
  console.log('Security:');
  console.log(`  Security score: ${security.securityPercentage}% ${security.securityPercentage >= 80 ? '✅' : '❌'}\n`);
  
  console.log('Images:');
  console.log(`  Optimized formats: ${images.filter(i => i.contentType.includes('webp') || i.contentType.includes('avif')).length}/${images.length}\n`);
  
  console.log('Static Assets:');
  console.log(`  Immutable caching: ${staticAssets.filter(s => s.immutable).length}/${staticAssets.length}\n`);
  
  // Overall score
  const scores = [
    performance.responseTime < 1000,
    caching.hasCaching,
    compression.isCompressed,
    security.securityPercentage >= 80,
    images.some(i => i.contentType.includes('webp') || i.contentType.includes('avif')),
    staticAssets.some(s => s.immutable)
  ];
  
  const overallScore = (scores.filter(Boolean).length / scores.length * 100).toFixed(1);
  console.log(`Overall CDN Score: ${overallScore}% ${overallScore >= 80 ? '✅' : '❌'}`);
}

// Main test function
async function runTests() {
  const url = process.argv[2] || TEST_URL;
  console.log(`Testing CDN at: ${url}\n`);
  
  try {
    const results = {};
    
    if (TESTS.performance) {
      results.performance = await testPerformance(url);
    }
    
    if (TESTS.caching) {
      results.caching = await testCaching(url);
    }
    
    if (TESTS.compression) {
      results.compression = await testCompression(url);
    }
    
    if (TESTS.security) {
      results.security = await testSecurity(url);
    }
    
    if (TESTS.images) {
      results.images = await testImages(url);
    }
    
    results.staticAssets = await testStaticAssets(url);
    
    generateReport(results);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testPerformance, testCaching, testCompression, testSecurity, testImages };

