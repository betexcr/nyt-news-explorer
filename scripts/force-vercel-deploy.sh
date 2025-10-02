#!/bin/bash

# Force Vercel deployment with cache invalidation
set -e

echo "🚀 Starting force Vercel deployment with cache invalidation..."

# Step 1: Clean all build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf build/
rm -rf .vercel/
rm -rf node_modules/.cache/
rm -rf .next/

# Step 2: Clear any local caches
echo "🗑️  Clearing local caches..."
if command -v bun &> /dev/null; then
    bun pm cache rm
elif command -v npm &> /dev/null; then
    npm cache clean --force
elif command -v yarn &> /dev/null; then
    yarn cache clean
fi

# Step 3: Install dependencies fresh
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
elif command -v npm &> /dev/null; then
    npm ci
elif command -v yarn &> /dev/null; then
    yarn install --frozen-lockfile
fi

# Step 4: Build with cache busting
echo "🔨 Building with cache busting..."
export GENERATE_SOURCEMAP=false
export DISABLE_ESLINT_PLUGIN=true
export NODE_ENV=production

if command -v bun &> /dev/null; then
    bun run build
elif command -v npm &> /dev/null; then
    npm run build
elif command -v yarn &> /dev/null; then
    yarn build
fi

# Step 5: Verify build
echo "🔍 Verifying build files..."
if [ -d "build" ]; then
    echo "✅ Build directory created"
    ls -la build/
    echo "📄 JavaScript files:"
    find build -name "*.js" -type f
    echo "📄 CSS files:"
    find build -name "*.css" -type f
else
    echo "❌ Build directory not found"
    exit 1
fi

# Step 6: Deploy to Vercel with force
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    # Force deployment without cache
    vercel --prod --force --no-cache
    echo "✅ Vercel deployment completed"
else
    echo "❌ Vercel CLI not found. Please install it with: npm i -g vercel"
    echo "📝 Manual deployment steps:"
    echo "1. Push changes to git"
    echo "2. Go to Vercel dashboard"
    echo "3. Click 'Redeploy' with 'Use existing Build Cache' UNCHECKED"
    echo "4. After deployment, go to Settings > Caches and click 'Purge CDN Cache'"
fi

# Step 7: Post-deployment cache invalidation
echo "🔄 Post-deployment steps:"
echo "1. Wait 2-3 minutes for deployment to complete"
echo "2. Go to your Vercel project dashboard"
echo "3. Navigate to Settings > Caches"
echo "4. Click 'Purge CDN Cache' to clear all cached assets"
echo "5. Test the website in incognito mode"

echo "✅ Force deployment script completed!"
echo "🌍 Your app should be updated at: https://nyt.brainvaultdev.com/"
echo "💡 If issues persist, try:"
echo "   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   - Clear browser cache completely"
echo "   - Test in incognito/private mode"
