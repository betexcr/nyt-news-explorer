#!/bin/bash

# Robust deployment script with better error handling
set -e

echo "🚀 Starting robust deployment..."

# Build the app
echo "📦 Building React app..."
bun run build

# Verify build files
echo "🔍 Verifying build files..."
ls -la build/static/js/
ls -la build/static/css/

# Check what index.html expects
echo "📄 Checking index.html references..."
grep -o 'main\.[a-zA-Z0-9]*\.js' build/index.html
grep -o 'main\.[a-zA-Z0-9]*\.css' build/index.html

# Copy configuration files
echo "⚙️  Copying server configuration files..."
cp public/.htaccess build/.htaccess
cp public/web.config build/web.config
cp public/_headers build/_headers

# Create lftp script file
echo "📝 Creating lftp script..."
cat > /tmp/deploy.lftp << 'EOF'
set ftp:passive-mode yes
set ftp:ssl-allow no
set net:max-retries 3
set net:timeout 120
set xfer:clobber on
set mirror:parallel 8

open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_SERVER

echo "Step 1: Removing old directory completely..."
rm -rf /domains/brainvaultdev.com/public_html/nyt/
mkdir -p /domains/brainvaultdev.com/public_html/nyt/
cd /domains/brainvaultdev.com/public_html/nyt/

echo "Step 2: Uploading fresh build files..."
mirror -R --ignore-time --overwrite --parallel=8 --verbose ./build/ .

echo "Step 3: Verifying deployment..."
echo "Files in static/js/:"
cls -la static/js/
echo "Files in static/css/:"
cls -la static/css/
echo "Total files deployed:"
ls -la | wc -l

quit
EOF

# Deploy using lftp script
echo "🌐 Performing deployment using lftp script..."
lftp -f /tmp/deploy.lftp

# Clean up
rm -f /tmp/deploy.lftp

echo "✅ Robust deployment completed!"
echo "🌍 Check your app at: https://nyt.brainvaultdev.com/"
echo "💡 If you still see issues, try clearing browser cache (Ctrl+Shift+R)"
