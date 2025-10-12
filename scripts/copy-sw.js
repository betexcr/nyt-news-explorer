#!/usr/bin/env node

/**
 * Post-build script to copy service worker to build directory
 * This ensures the service worker is available after React build
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'public', 'sw.js');
const buildDir = path.join(__dirname, '..', 'build');
const destFile = path.join(buildDir, 'sw.js');

console.log('📋 Copying service worker to build directory...');

try {
  // Check if build directory exists
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Check if source service worker exists
  if (!fs.existsSync(sourceFile)) {
    console.log('❌ Service worker source file not found:', sourceFile);
    process.exit(1);
  }

  // Copy service worker to build directory
  fs.copyFileSync(sourceFile, destFile);
  
  console.log('✅ Service worker copied successfully to build directory');
  console.log('📍 Source:', sourceFile);
  console.log('📍 Destination:', destFile);
  
} catch (error) {
  console.error('❌ Error copying service worker:', error.message);
  process.exit(1);
}
