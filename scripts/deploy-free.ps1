# Free Tier Deployment Script for NYT News Explorer (PowerShell)
# This script deploys the backend to Railway and updates the frontend configuration

param(
    [string]$NytApiKey = ""
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Check if required tools are installed
function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed. Please install Node.js first."
        exit 1
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed. Please install npm first."
        exit 1
    }
    
    Write-Success "Dependencies check passed"
}

# Install Railway CLI
function Install-RailwayCli {
    Write-Status "Installing Railway CLI..."
    
    if (Get-Command railway -ErrorAction SilentlyContinue) {
        Write-Success "Railway CLI already installed"
    } else {
        npm install -g @railway/cli
        Write-Success "Railway CLI installed"
    }
}

# Deploy backend to Railway
function Deploy-Backend {
    Write-Status "Deploying backend to Railway..."
    
    # Check if user is logged in to Railway
    $whoami = railway whoami 2>$null
    if (-not $whoami) {
        Write-Warning "Please login to Railway first:"
        Write-Host "Run: railway login"
        Write-Host "Then run this script again."
        exit 1
    }
    
    # Navigate to API directory
    Set-Location api
    
    # Create project if it doesn't exist
    $project = railway project 2>$null
    if (-not $project) {
        Write-Status "Creating Railway project..."
        railway project create nyt-news-explorer-api
    }
    
    # Add Redis service
    Write-Status "Adding Redis service..."
    railway add redis
    
    # Set environment variables
    Write-Status "Setting environment variables..."
    railway variables set NODE_ENV=production
    railway variables set PORT=3000
    railway variables set LOG_LEVEL=info
    
    # Ask for NYT API key
    if (-not $NytApiKey) {
        $NytApiKey = Read-Host "Enter your NYT API key" -AsSecureString
        $NytApiKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($NytApiKey))
    }
    
    if ($NytApiKey) {
        railway variables set NYT_API_KEY="$NytApiKey"
        Write-Success "NYT API key set"
    } else {
        Write-Warning "No NYT API key provided. You'll need to set it manually in Railway dashboard."
    }
    
    # Deploy
    Write-Status "Deploying to Railway..."
    railway up
    
    # Get the deployment URL
    $script:RailwayUrl = railway domain
    Write-Success "Backend deployed to: $script:RailwayUrl"
    
    Set-Location ..
}

# Update frontend configuration
function Update-FrontendConfig {
    Write-Status "Updating frontend configuration..."
    
    if ($script:RailwayUrl) {
        # Update the API configuration
        $configFile = "src/config/api.ts"
        $content = Get-Content $configFile -Raw
        $content = $content -replace "https://nyt-news-explorer-api.railway.app", $script:RailwayUrl
        Set-Content $configFile $content
        Write-Success "Frontend configuration updated with Railway URL: $script:RailwayUrl"
    } else {
        Write-Warning "Railway URL not found. Please update src/config/api.ts manually."
    }
}

# Test the deployment
function Test-Deployment {
    Write-Status "Testing deployment..."
    
    if ($script:RailwayUrl) {
        # Test health endpoint
        try {
            $healthResponse = Invoke-WebRequest -Uri "$script:RailwayUrl/health" -TimeoutSec 10 -ErrorAction Stop
            Write-Success "Health endpoint is responding"
        } catch {
            Write-Warning "Health endpoint is not responding. The service might still be starting."
        }
        
        # Test search endpoint
        try {
            $searchResponse = Invoke-WebRequest -Uri "$script:RailwayUrl/api/articles/search?q=test" -TimeoutSec 10 -ErrorAction Stop
            Write-Success "Search endpoint is responding"
        } catch {
            Write-Warning "Search endpoint is not responding"
        }
    }
}

# Main execution
function Main {
    Write-Host "🎯 NYT News Explorer - Free Tier Deployment" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Dependencies
    Install-RailwayCli
    Deploy-Backend
    Update-FrontendConfig
    Test-Deployment
    
    Write-Host ""
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "======================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Deploy your frontend to Hostinger using your existing GitHub Actions"
    Write-Host "2. Update CORS_ORIGIN in Railway dashboard to match your frontend URL"
    Write-Host "3. Test the complete application"
    Write-Host ""
    Write-Host "Railway Dashboard: https://railway.app/dashboard" -ForegroundColor Blue
    Write-Host "Your API URL: $script:RailwayUrl" -ForegroundColor Blue
    Write-Host ""
    Write-Host "For detailed instructions, see: docs/deployment-guide.md" -ForegroundColor Blue
}

# Run main function
Main

