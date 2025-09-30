#!/usr/bin/env bash
set -euo pipefail

# Netlify CDN Deployment Script
# This script builds and deploys the application to Netlify with CDN optimization

echo "🚀 Starting Netlify CDN deployment..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if we're logged in to Netlify
if ! netlify status &> /dev/null; then
    echo "🔐 Please log in to Netlify:"
    netlify login
fi

# Build the application with CDN optimizations
echo "📦 Building application with CDN optimizations..."
bun run build:cdn

# Run asset optimization
echo "⚡ Optimizing assets for CDN..."
bun run cdn:optimize

# Deploy to Netlify
echo "🌐 Deploying to Netlify CDN..."

# Check if this is a production deployment
if [ "${1:-}" = "--prod" ]; then
    echo "🚀 Production deployment to CDN..."
    netlify deploy --prod --dir=build
else
    echo "🧪 Preview deployment to CDN..."
    netlify deploy --dir=build
fi

# Get deployment URL
DEPLOY_URL=$(netlify status --json | jq -r '.site.url')
echo "✅ Deployment complete!"
echo "🌍 CDN URL: $DEPLOY_URL"

# Run CDN tests
echo "🧪 Running CDN performance tests..."
bun run cdn:test "$DEPLOY_URL"

echo "🎉 CDN deployment successful!"
echo "📊 Check the test results above for performance metrics"

