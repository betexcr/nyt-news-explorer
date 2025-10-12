#!/bin/bash

# Free Tier Deployment Script for NYT News Explorer
# This script deploys the backend to Railway and updates the frontend configuration

set -e

echo "🚀 Starting Free Tier Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Install Railway CLI
install_railway_cli() {
    print_status "Installing Railway CLI..."
    
    if command -v railway &> /dev/null; then
        print_success "Railway CLI already installed"
    else
        npm install -g @railway/cli
        print_success "Railway CLI installed"
    fi
}

# Deploy backend to Railway
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    # Check if user is logged in to Railway
    if ! railway whoami &> /dev/null; then
        print_warning "Please login to Railway first:"
        echo "Run: railway login"
        echo "Then run this script again."
        exit 1
    fi
    
    # Navigate to API directory
    cd api
    
    # Create project if it doesn't exist
    if ! railway project &> /dev/null; then
        print_status "Creating Railway project..."
        railway project create nyt-news-explorer-api
    fi
    
    # Add Redis service
    print_status "Adding Redis service..."
    railway add redis
    
    # Set environment variables
    print_status "Setting environment variables..."
    railway variables set NODE_ENV=production
    railway variables set PORT=3000
    railway variables set LOG_LEVEL=info
    
    # Ask for NYT API key
    if [ -z "$NYT_API_KEY" ]; then
        echo -n "Enter your NYT API key: "
        read -s NYT_API_KEY
        echo
    fi
    
    if [ -n "$NYT_API_KEY" ]; then
        railway variables set NYT_API_KEY="$NYT_API_KEY"
        print_success "NYT API key set"
    else
        print_warning "No NYT API key provided. You'll need to set it manually in Railway dashboard."
    fi
    
    # Deploy
    print_status "Deploying to Railway..."
    railway up
    
    # Get the deployment URL
    RAILWAY_URL=$(railway domain)
    print_success "Backend deployed to: $RAILWAY_URL"
    
    cd ..
}

# Update frontend configuration
update_frontend_config() {
    print_status "Updating frontend configuration..."
    
    if [ -n "$RAILWAY_URL" ]; then
        # Update the API configuration
        sed -i.bak "s|https://nyt-news-explorer-api.railway.app|$RAILWAY_URL|g" src/config/api.ts
        print_success "Frontend configuration updated with Railway URL: $RAILWAY_URL"
    else
        print_warning "Railway URL not found. Please update src/config/api.ts manually."
    fi
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    if [ -n "$RAILWAY_URL" ]; then
        # Test health endpoint
        if curl -s "$RAILWAY_URL/health" > /dev/null; then
            print_success "Health endpoint is responding"
        else
            print_warning "Health endpoint is not responding. The service might still be starting."
        fi
        
        # Test search endpoint
        if curl -s "$RAILWAY_URL/api/articles/search?q=test" > /dev/null; then
            print_success "Search endpoint is responding"
        else
            print_warning "Search endpoint is not responding"
        fi
    fi
}

# Main execution
main() {
    echo "🎯 NYT News Explorer - Free Tier Deployment"
    echo "=========================================="
    echo
    
    check_dependencies
    install_railway_cli
    deploy_backend
    update_frontend_config
    test_deployment
    
    echo
    echo "🎉 Deployment Complete!"
    echo "======================"
    echo
    echo "Next steps:"
    echo "1. Deploy your frontend to Hostinger using your existing GitHub Actions"
    echo "2. Update CORS_ORIGIN in Railway dashboard to match your frontend URL"
    echo "3. Test the complete application"
    echo
    echo "Railway Dashboard: https://railway.app/dashboard"
    echo "Your API URL: $RAILWAY_URL"
    echo
    echo "For detailed instructions, see: docs/deployment-guide.md"
}

# Run main function
main "$@"

