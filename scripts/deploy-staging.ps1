# Deploy to staging with feature flags ON
# This script sets up the staging environment for pilot launch

Write-Host "Deploying to staging with pilot configuration..." -ForegroundColor Green

# Set environment variables for staging
$env:PILOT_ROLLOUT_PCT = "0.10"  # 10% initial rollout
$env:NODE_ENV = "production"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  PILOT_ROLLOUT_PCT = $env:PILOT_ROLLOUT_PCT" -ForegroundColor Cyan
Write-Host "  NODE_ENV = $env:NODE_ENV" -ForegroundColor Cyan

# Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Start the production server
    Write-Host "Starting production server on port 3003..." -ForegroundColor Yellow
    Write-Host "  Server will be available at: http://localhost:3003" -ForegroundColor Cyan
    Write-Host "  Analytics dashboard: http://localhost:3003/analytics" -ForegroundColor Cyan
    Write-Host "  Instant Practice: http://localhost:3003/try" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pilot Configuration:" -ForegroundColor Yellow
    Write-Host "  - 10% traffic will see Instant Practice (/try)" -ForegroundColor White
    Write-Host "  - Analytics pipeline active with rate limiting" -ForegroundColor White
    Write-Host "  - Feature flags enabled for pilot cohort" -ForegroundColor White
    Write-Host ""
    Write-Host "Monitoring:" -ForegroundColor Yellow
    Write-Host "  - Check /analytics for KPIs (TTV, Mic Grant %, Activation %)" -ForegroundColor White
    Write-Host "  - Monitor server logs for analytics events" -ForegroundColor White
    Write-Host "  - Watch for any errors in browser console" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop: Ctrl+C" -ForegroundColor Red
    Write-Host ""
    
    # Start the server
    npm run start
} else {
    Write-Host "Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}
