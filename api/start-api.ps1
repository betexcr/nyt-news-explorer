# PowerShell script to start the API server on port 3001
Write-Host "🚀 Starting NYT News API Server on port 3001..." -ForegroundColor Green

# Set environment variables from your existing .env.local
$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:NYT_API_KEY = "ykBBKwfsn0sIyA4A2RUaw0wnp4eWDVK7"
$env:REDIS_URL = "rediss://default:AUEYAAIncDIzZGVmMmQ1ZTVmMTg0MzI1Yjk3ZmEwMDBiZWRkNTg4YnAyMTY2NjQ@hardy-jackass-16664.upstash.io:6379"
$env:UPSTASH_REDIS_REST_URL = "https://hardy-jackass-16664.upstash.io"
$env:UPSTASH_REDIS_REST_TOKEN = "AUEYAAIncDIzZGVmMmQ1ZTVmMTg0MzI1Yjk3ZmEwMDBiZWRkNTg4YnAyMTY2NjQ"
$env:BUILD_ID = "vercel-caching-v1"

# Additional required variables for full server
$env:JWT_SECRET = "development-secret-key-at-least-32-characters-long-for-security"
$env:JWT_ISSUER = "http://localhost:3001"
$env:JWT_AUDIENCE = "nyt-news-explorer"
$env:OAUTH_CLIENT_ID = "dev-client-id"
$env:OAUTH_CLIENT_SECRET = "dev-client-secret"
$env:OAUTH_REDIRECT_URI = "http://localhost:3000/auth/callback"
$env:OAUTH_AUTHORIZATION_URL = "https://dev.example.com/oauth/authorize"
$env:OAUTH_TOKEN_URL = "https://dev.example.com/oauth/token"
$env:OAUTH_JWKS_URL = "https://dev.example.com/.well-known/jwks.json"

# CORS for development - allow both localhost:3000 (React) and localhost:3001 (API)
$env:CORS_ORIGIN = "http://localhost:3000,http://localhost:3001,https://nyt.brainvaultdev.com"

Write-Host "📋 Environment configured:" -ForegroundColor Yellow
Write-Host "   - Port: 3001" -ForegroundColor White
Write-Host "   - CORS: http://localhost:3000, http://localhost:3001" -ForegroundColor White
Write-Host "   - Mode: development" -ForegroundColor White

Write-Host "🔧 Starting full API server with Swagger and Redis monitoring..." -ForegroundColor Blue
bun run dev
