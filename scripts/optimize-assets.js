#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Asset optimization script for CDN deployment
 * Optimizes images, generates webp/avif versions, and creates asset manifest
 */

const BUILD_DIR = path.join(__dirname, '../build');
const PUBLIC_DIR = path.join(__dirname, '../public');

console.log('🚀 Starting CDN asset optimization...');

// Ensure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Function to optimize images
function optimizeImages() {
  console.log('📸 Optimizing images...');
  
  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  const imageFiles = [];
  
  // Find all image files
  function findImages(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findImages(filePath);
      } else if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
        imageFiles.push(filePath);
      }
    });
  }
  
  findImages(BUILD_DIR);
  
  console.log(`Found ${imageFiles.length} images to optimize`);
  
  // Generate WebP versions (if sharp is available)
  try {
    const sharp = require('sharp');
    
    imageFiles.forEach(imagePath => {
      const ext = path.extname(imagePath);
      const baseName = path.basename(imagePath, ext);
      const dir = path.dirname(imagePath);
      const webpPath = path.join(dir, `${baseName}.webp`);
      const avifPath = path.join(dir, `${baseName}.avif`);
      
      // Generate WebP
      if (!fs.existsSync(webpPath)) {
        sharp(imagePath)
          .webp({ quality: 85 })
          .toFile(webpPath)
          .then(() => console.log(`✅ Generated WebP: ${path.relative(BUILD_DIR, webpPath)}`))
          .catch(err => console.warn(`⚠️  Failed to generate WebP for ${imagePath}:`, err.message));
      }
      
      // Generate AVIF
      if (!fs.existsSync(avifPath)) {
        sharp(imagePath)
          .avif({ quality: 80 })
          .toFile(avifPath)
          .then(() => console.log(`✅ Generated AVIF: ${path.relative(BUILD_DIR, avifPath)}`))
          .catch(err => console.warn(`⚠️  Failed to generate AVIF for ${imagePath}:`, err.message));
      }
    });
  } catch (err) {
    console.warn('⚠️  Sharp not available, skipping image optimization. Install with: npm install sharp');
  }
}

// Function to generate asset manifest
function generateAssetManifest() {
  console.log('📋 Generating asset manifest...');
  
  const manifest = {
    version: Date.now(),
    assets: {},
    preload: [],
    prefetch: []
  };
  
  // Scan build directory for assets
  function scanDirectory(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(basePath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, relativePath);
      } else {
        const ext = path.extname(file);
        const size = stat.size;
        
        manifest.assets[`/${relativePath}`] = {
          size,
          type: getAssetType(ext),
          lastModified: stat.mtime.toISOString()
        };
        
        // Add to preload/prefetch lists
        if (ext === '.css' || (ext === '.js' && file.includes('main'))) {
          manifest.preload.push(`/${relativePath}`);
        } else if (ext === '.js' && !file.includes('main')) {
          manifest.prefetch.push(`/${relativePath}`);
        }
      }
    });
  }
  
  scanDirectory(BUILD_DIR);
  
  // Write manifest
  const manifestPath = path.join(BUILD_DIR, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✅ Asset manifest generated: ${manifestPath}`);
  console.log(`📊 Total assets: ${Object.keys(manifest.assets).length}`);
  console.log(`⚡ Preload assets: ${manifest.preload.length}`);
  console.log(`🔮 Prefetch assets: ${manifest.prefetch.length}`);
}

// Function to get asset type
function getAssetType(ext) {
  const types = {
    '.js': 'script',
    '.css': 'style',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.webp': 'image',
    '.avif': 'image',
    '.svg': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
    '.html': 'document',
    '.json': 'data'
  };
  
  return types[ext.toLowerCase()] || 'other';
}

// Function to generate service worker for caching
function generateServiceWorker() {
  console.log('🔧 Generating service worker...');
  
  const swContent = `
// Service Worker for CDN optimization
const CACHE_NAME = 'nyt-news-explorer-v${Date.now()}';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests
  if (url.origin !== location.origin) return;
  
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(fetchResponse => {
            // Don't cache if not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Clone the response
            const responseToCache = fetchResponse.clone();
            
            // Cache static assets
            if (url.pathname.startsWith('/static/') || 
                url.pathname.match(/\\.(css|js|png|jpg|jpeg|webp|avif|svg|woff|woff2)$/)) {
              caches.open(STATIC_CACHE)
                .then(cache => cache.put(request, responseToCache));
            }
            
            return fetchResponse;
          });
      })
  );
});
`;

  const swPath = path.join(BUILD_DIR, 'sw.js');
  fs.writeFileSync(swPath, swContent);
  console.log(`✅ Service worker generated: ${swPath}`);
}

// Function to update HTML with preload hints
function updateHTMLWithPreloads() {
  console.log('🔗 Adding preload hints to HTML...');
  
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('⚠️  index.html not found');
    return;
  }
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Add preload hints for critical resources
  const preloadHints = [
    '<link rel="preload" href="/static/css/main.css" as="style">',
    '<link rel="preload" href="/static/js/main.js" as="script">',
    '<link rel="preload" href="/logo.webp" as="image">'
  ];
  
  // Insert preload hints before closing head tag
  const headCloseIndex = html.lastIndexOf('</head>');
  if (headCloseIndex !== -1) {
    const preloadBlock = preloadHints.join('\n  ') + '\n  ';
    html = html.slice(0, headCloseIndex) + preloadBlock + html.slice(headCloseIndex);
    
    fs.writeFileSync(indexPath, html);
    console.log('✅ Preload hints added to HTML');
  }
}

// Main execution
async function main() {
  try {
    optimizeImages();
    generateAssetManifest();
    generateServiceWorker();
    updateHTMLWithPreloads();
    
    console.log('🎉 CDN optimization complete!');
    console.log('📦 Ready for deployment with optimized assets');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { optimizeImages, generateAssetManifest, generateServiceWorker };

