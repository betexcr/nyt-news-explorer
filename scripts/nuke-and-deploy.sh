#!/bin/bash

# Nuclear deployment script - completely removes and recreates the deployment directory
set -e

echo "💥 NUCLEAR DEPLOYMENT - Complete folder replacement"
echo "This will completely remove and recreate the deployment directory"
echo ""

# Build the app
echo "📦 Building React app..."
bun run build

# Verify build files
echo "🔍 Verifying build files..."
ls -la build/static/js/
ls -la build/static/css/

# Check what index.html expects
echo "📄 Checking index.html references..."
JS_FILE=$(grep -o 'main\.[a-zA-Z0-9]*\.js' build/index.html)
CSS_FILE=$(grep -o 'main\.[a-zA-Z0-9]*\.css' build/index.html)
echo "JS file expected: $JS_FILE"
echo "CSS file expected: $CSS_FILE"

# Copy configuration files
echo "⚙️  Copying server configuration files..."
cp public/.htaccess build/.htaccess
cp public/web.config build/web.config
cp public/_headers build/_headers

# Nuclear deployment - completely remove and recreate
echo "💥 Performing nuclear deployment..."
lftp -e "
  set ftp:passive-mode yes;
  set ftp:ssl-allow no;
  set net:max-retries 5;
  set net:timeout 180;
  set xfer:clobber on;
  set mirror:parallel 10;
  open -u $FTP_USERNAME,$FTP_PASSWORD $FTP_SERVER;
  
  # NUCLEAR OPTION: Remove entire directory
  echo '💥 Step 1: NUKING old directory...';
  rm -rf /domains/brainvaultdev.com/public_html/nyt/;
  
  # Create fresh directory
  echo '🏗️  Step 2: Creating fresh directory...';
  mkdir -p /domains/brainvaultdev.com/public_html/nyt/;
  cd /domains/brainvaultdev.com/public_html/nyt/;
  
  # Upload everything fresh
  echo '📤 Step 3: Uploading fresh files...';
  mirror -R --ignore-time --overwrite --parallel=10 --verbose ./build/ .;
  
  # Verify the deployment
  echo '✅ Step 4: Verifying deployment...';
  echo 'Files in static/js/:';
  cls -la static/js/;
  echo 'Files in static/css/:';
  cls -la static/css/;
  echo 'Total files deployed:';
  find . -type f | wc -l;
  
  # Test specific files
  echo '🧪 Step 5: Testing specific files...';
  if [ -f \"static/js/$JS_FILE\" ]; then
    echo \"✅ JS file $JS_FILE found\";
  else
    echo \"❌ JS file $JS_FILE NOT found\";
  fi;
  
  if [ -f \"static/css/$CSS_FILE\" ]; then
    echo \"✅ CSS file $CSS_FILE found\";
  else
    echo \"❌ CSS file $CSS_FILE NOT found\";
  fi;
  
  quit
"

echo "✅ Nuclear deployment completed!"
echo "🌍 Check your app at: https://nyt.brainvaultdev.com/"
echo "💡 Clear browser cache (Ctrl+Shift+R) if you still see issues"
