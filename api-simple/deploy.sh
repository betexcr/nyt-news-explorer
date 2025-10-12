#!/bin/bash

# Deploy to Railway
echo "Deploying to Railway..."

# Set environment variables
railway variables --set "REDIS_URL=rediss://default:AUEYAAIncDIzZGVmMmQ1ZTVmMTg0MzI1Yjk3ZmEwMDBiZWRkNTg4YnAyMTY2NjQ@hardy-jackass-16664.upstash.io:6379"
railway variables --set "CORS_ORIGIN=https://nyt.brainvaultdev.com"
railway variables --set "NIXPACKS_START_CMD=node server-minimal.js"

# Deploy
railway up

echo "Deployment complete!"
echo "API URL: https://nyt-news-api-production.up.railway.app"
