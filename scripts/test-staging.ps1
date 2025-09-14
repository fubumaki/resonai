# Test staging deployment
# Runs essential tests to verify staging deployment

Write-Host "🧪 Testing staging deployment..." -ForegroundColor Green

# Test 1: Health check
Write-Host "1️⃣ Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/api/healthz" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Health check failed: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Analytics endpoint
Write-Host "2️⃣ Testing analytics endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/api/events?limit=1" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Analytics endpoint accessible" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Analytics endpoint failed: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Analytics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Home page loads
Write-Host "3️⃣ Testing home page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200 -and $response.Content.Length -gt 1000) {
        Write-Host "   ✅ Home page loads successfully" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Home page failed: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Home page failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Analytics dashboard
Write-Host "4️⃣ Testing analytics dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/analytics" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200 -and $response.Content.Length -gt 1000) {
        Write-Host "   ✅ Analytics dashboard accessible" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Analytics dashboard failed: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Analytics dashboard failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All staging tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "  • Visit http://localhost:3003/analytics to monitor KPIs" -ForegroundColor White
Write-Host "  • Test /try route with pilot cohort cookie" -ForegroundColor White
Write-Host "  • Monitor server logs for analytics events" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To test /try route manually:" -ForegroundColor Yellow
Write-Host "  • Set cookie: pilot_cohort=pilot" -ForegroundColor White
Write-Host "  • Set localStorage: ff.instantPractice=true" -ForegroundColor White
Write-Host "  • Visit http://localhost:3003/try" -ForegroundColor White
