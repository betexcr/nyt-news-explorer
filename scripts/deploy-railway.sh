#!/bin/bash

# Deploy Backend to Railway
# This script sets up the backend API on Railway with Redis

echo "🚀 Deploying Backend to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway (will prompt for login)
echo "Please login to Railway..."
railway login

# Create new project
echo "Creating Railway project..."
railway project create nyt-news-explorer-api

# Add Redis service
echo "Adding Redis service..."
railway add redis

# Set environment variables
echo "Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set LOG_LEVEL=info

# Set Redis connection (Railway will auto-set REDIS_URL)
echo "Redis will be automatically configured via REDIS_URL"

# Deploy from api directory
echo "Deploying to Railway..."
cd api
railway up

echo "✅ Deployment complete!"
echo "Your API will be available at: https://your-project-name.railway.app"
echo "Redis is automatically configured and connected"

