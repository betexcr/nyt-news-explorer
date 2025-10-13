# Railway Setup Script - Run this AFTER you've logged in with `npx @railway/cli login`
# This script will complete the Railway deployment setup

param(
    [Parameter(Mandatory=$true)]
    [string]$NytApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$CorsOrigin = "https://nyt.brainvaultdev.com"
)

Write-Host "🚀 Setting up Railway deployment..." -ForegroundColor Cyan

# Check if user is logged in
Write-Host "Checking Railway authentication..." -ForegroundColor Yellow
$whoami = npx @railway/cli whoami 2>$null
if (-not $whoami) {
    Write-Host "❌ Please login to Railway first:" -ForegroundColor Red
    Write-Host "Run: npx @railway/cli login" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green

# Navigate to API directory
Set-Location api

# Initialize Railway project
Write-Host "Initializing Railway project..." -ForegroundColor Yellow
npx @railway/cli init

# Add Redis service
Write-Host "Adding Redis service..." -ForegroundColor Yellow
npx @railway/cli add redis

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=3000
npx @railway/cli variables set LOG_LEVEL=info
npx @railway/cli variables set NYT_API_KEY="$NytApiKey"
npx @railway/cli variables set CORS_ORIGIN="$CorsOrigin"

Write-Host "✅ Environment variables set" -ForegroundColor Green

# Deploy
Write-Host "Deploying to Railway..." -ForegroundColor Yellow
npx @railway/cli up

# Get the deployment URL
Write-Host "Getting deployment URL..." -ForegroundColor Yellow
$railwayUrl = npx @railway/cli domain

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Your API URL: $railwayUrl" -ForegroundColor Cyan

# Go back to root directory
Set-Location ..

# Update frontend configuration
Write-Host "Updating frontend configuration..." -ForegroundColor Yellow
$configFile = "src/config/api.ts"
$content = Get-Content $configFile -Raw
$content = $content -replace "https://nyt-news-explorer-api.railway.app", $railwayUrl
Set-Content $configFile $content

Write-Host "✅ Frontend configuration updated" -ForegroundColor Green

# Test the deployment
Write-Host "Testing deployment..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$railwayUrl/health" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Health endpoint responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Health endpoint not responding yet (service might still be starting)" -ForegroundColor Yellow
}

try {
    $searchResponse = Invoke-WebRequest -Uri "$railwayUrl/api/articles/search?q=test" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Search endpoint responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Search endpoint not responding yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Railway setup complete!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit and push your changes to trigger frontend deployment" -ForegroundColor White
Write-Host "2. Test your complete application" -ForegroundColor White
Write-Host "3. Monitor Railway dashboard for performance" -ForegroundColor White
Write-Host ""
Write-Host "Railway Dashboard: https://railway.app/dashboard" -ForegroundColor Blue
Write-Host "Your API URL: $railwayUrl" -ForegroundColor Blue



