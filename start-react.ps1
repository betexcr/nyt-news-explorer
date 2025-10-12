# PowerShell script to start the React app on port 3000
Write-Host "🚀 Starting NYT News Explorer React App on port 3000..." -ForegroundColor Green

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   - Port: 3000 (fixed)" -ForegroundColor White
Write-Host "   - API will be available at: http://localhost:3001" -ForegroundColor White

Write-Host "🔧 Starting React development server..." -ForegroundColor Blue
bun run dev
