@echo off
REM Railway Setup Script for Windows
REM Run this AFTER you've logged in with: npx @railway/cli login

echo.
echo 🚀 Setting up Railway deployment...
echo.

REM Check if user is logged in
echo Checking Railway authentication...
npx @railway/cli whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Please login to Railway first:
    echo Run: npx @railway/cli login
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Authentication verified
echo.

REM Navigate to API directory
cd api

REM Initialize Railway project
echo Initializing Railway project...
npx @railway/cli init

REM Add Redis service
echo Adding Redis service...
npx @railway/cli add redis

REM Set environment variables
echo Setting environment variables...
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set PORT=3000
npx @railway/cli variables set LOG_LEVEL=info

REM Ask for NYT API key
set /p NYT_API_KEY="Enter your NYT API key: "
npx @railway/cli variables set NYT_API_KEY="%NYT_API_KEY%"
npx @railway/cli variables set CORS_ORIGIN="https://nyt.brainvaultdev.com"

echo ✅ Environment variables set
echo.

REM Deploy
echo Deploying to Railway...
npx @railway/cli up

REM Get the deployment URL
echo Getting deployment URL...
for /f "delims=" %%i in ('npx @railway/cli domain') do set RAILWAY_URL=%%i

echo ✅ Deployment complete!
echo Your API URL: %RAILWAY_URL%
echo.

REM Go back to root directory
cd ..

REM Update frontend configuration
echo Updating frontend configuration...
powershell -Command "(Get-Content 'src/config/api.ts') -replace 'https://nyt-news-explorer-api.railway.app', '%RAILWAY_URL%' | Set-Content 'src/config/api.ts'"

echo ✅ Frontend configuration updated
echo.

REM Test the deployment
echo Testing deployment...
curl -s "%RAILWAY_URL%/health" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Health endpoint not responding yet (service might still be starting)
) else (
    echo ✅ Health endpoint responding
)

echo.
echo 🎉 Railway setup complete!
echo =========================
echo.
echo Next steps:
echo 1. Commit and push your changes to trigger frontend deployment
echo 2. Test your complete application
echo 3. Monitor Railway dashboard for performance
echo.
echo Railway Dashboard: https://railway.app/dashboard
echo Your API URL: %RAILWAY_URL%
echo.
pause



