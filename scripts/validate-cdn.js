#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * CDN Configuration Validation Script
 * Validates that all CDN components are properly configured
 */

console.log('🔍 Validating CDN configuration...\n');

const checks = [
  {
    name: 'Netlify Configuration',
    file: 'netlify.toml',
    required: true,
    description: 'Main Netlify configuration file'
  },
  {
    name: 'Headers Configuration',
    file: 'public/_headers',
    required: true,
    description: 'HTTP headers for caching and security'
  },
  {
    name: 'Image Optimizer Edge Function',
    file: 'netlify/edge-functions/image-optimizer.ts',
    required: true,
    description: 'Edge function for image optimization'
  },
  {
    name: 'API Cache Edge Function',
    file: 'netlify/edge-functions/api-cache.ts',
    required: true,
    description: 'Edge function for API response caching'
  },
  {
    name: 'Performance Monitor Edge Function',
    file: 'netlify/edge-functions/performance-monitor.ts',
    required: true,
    description: 'Edge function for performance monitoring'
  },
  {
    name: 'Asset Optimization Script',
    file: 'scripts/optimize-assets.js',
    required: true,
    description: 'Script for optimizing assets during build'
  },
  {
    name: 'CDN Test Script',
    file: 'scripts/test-cdn.js',
    required: true,
    description: 'Script for testing CDN performance'
  },
  {
    name: 'Netlify Deployment Script',
    file: 'scripts/deploy-netlify.sh',
    required: true,
    description: 'Script for deploying to Netlify CDN'
  },
  {
    name: 'Environment Example',
    file: 'env.example',
    required: false,
    description: 'Example environment variables file'
  },
  {
    name: 'CDN Documentation',
    file: 'CDN-README.md',
    required: false,
    description: 'Comprehensive CDN documentation'
  }
];

let passed = 0;
let failed = 0;
let warnings = 0;

console.log('📋 Configuration Check Results:\n');

checks.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    console.log(`✅ ${check.name}: Found`);
    passed++;
    
    // Additional validation for key files
    if (check.file === 'netlify.toml') {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasBuild = content.includes('[build]');
      const hasHeaders = content.includes('[[headers]]');
      const hasRedirects = content.includes('[[redirects]]');
      
      if (hasBuild && hasHeaders && hasRedirects) {
        console.log(`   └─ Configuration sections: ✅ Complete`);
      } else {
        console.log(`   └─ Configuration sections: ⚠️  Incomplete`);
        warnings++;
      }
    }
    
    if (check.file === 'public/_headers') {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasSecurity = content.includes('X-Content-Type-Options');
      const hasCaching = content.includes('Cache-Control');
      const hasStaticAssets = content.includes('/static/*');
      
      if (hasSecurity && hasCaching && hasStaticAssets) {
        console.log(`   └─ Header configuration: ✅ Complete`);
      } else {
        console.log(`   └─ Header configuration: ⚠️  Incomplete`);
        warnings++;
      }
    }
    
  } else if (check.required) {
    console.log(`❌ ${check.name}: Missing (Required)`);
    failed++;
  } else {
    console.log(`⚠️  ${check.name}: Missing (Optional)`);
    warnings++;
  }
});

// Check package.json scripts
console.log('\n📦 Package.json Scripts Check:\n');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = [
    'build:cdn',
    'deploy:netlify',
    'deploy:preview',
    'cdn:optimize',
    'cdn:test'
  ];
  
  requiredScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`✅ ${script}: Configured`);
      passed++;
    } else {
      console.log(`❌ ${script}: Missing`);
      failed++;
    }
  });
} else {
  console.log('❌ package.json: Not found');
  failed++;
}

// Check dependencies
console.log('\n🔧 Dependencies Check:\n');

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const devDeps = packageJson.devDependencies || {};
  
  const requiredDeps = [
    '@netlify/plugin-lighthouse',
    'netlify-cli'
  ];
  
  requiredDeps.forEach(dep => {
    if (devDeps[dep]) {
      console.log(`✅ ${dep}: Installed`);
      passed++;
    } else {
      console.log(`❌ ${dep}: Missing`);
      failed++;
    }
  });
}

// Summary
console.log('\n📊 Validation Summary:\n');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);

if (failed === 0) {
  console.log('\n🎉 CDN configuration is valid!');
  console.log('🚀 Ready for deployment to Netlify CDN');
} else {
  console.log('\n❌ CDN configuration has issues that need to be fixed');
  process.exit(1);
}

if (warnings > 0) {
  console.log('\n⚠️  Some optional components are missing but not required');
}

console.log('\n📚 Next steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Configure environment variables: cp env.example .env');
console.log('3. Test CDN locally: npm run cdn:test');
console.log('4. Deploy to Netlify: npm run deploy:preview');
console.log('5. Deploy to production: npm run deploy:netlify');

