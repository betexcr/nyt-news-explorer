#!/bin/bash

# Force deployment script to ensure correct files are uploaded
set -e

echo "🚀 Starting force deployment..."

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

# Deploy using lftp with aggressive settings
echo "🌐 Deploying to server..."
lftp -e "
  set ftp:passive-mode yes;
  set ftp:ssl-allow no;
  set net:max-retries 3;
  set net:timeout 120;
  set xfer:clobber on;
  set mirror:parallel 8;
  set mirror:delete-first on;
  open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_SERVER;
  mkdir -p /domains/brainvaultdev.com/public_html/nyt/;
  cd /domains/brainvaultdev.com/public_html/nyt/;
  mirror -R --delete --ignore-time --overwrite --parallel=8 --verbose ./build/ .;
  echo 'Deployment completed. Files on server:';
  cls -la static/js/;
  cls -la static/css/;
  quit
"

echo "✅ Force deployment completed!"
echo "🌍 Check your app at: https://nyt.brainvaultdev.com/"
echo "💡 If you still see issues, try clearing browser cache (Ctrl+Shift+R)"
