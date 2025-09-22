# test-flow-loading.ps1
# Test that the DailyPractice flow can be loaded and parsed correctly

Write-Host "🧪 Testing Flow Loading..." -ForegroundColor Cyan

try {
    # Test JSON parsing
    Write-Host "📄 Loading DailyPractice_v1.json..." -ForegroundColor Yellow
    $flowJson = Get-Content "flows/presets/DailyPractice_v1.json" -Raw
    $flow = $flowJson | ConvertFrom-Json
    
    # Validate structure
    Write-Host "✅ JSON parsed successfully" -ForegroundColor Green
    
    # Check required fields
    $requiredFields = @('version', 'flowName', 'steps')
    foreach ($field in $requiredFields) {
        if ($flow.$field) {
            Write-Host "✅ $field field present" -ForegroundColor Green
        } else {
            Write-Host "❌ $field field missing" -ForegroundColor Red
            exit 1
        }
    }
    
    # Check version
    if ($flow.version -eq 1) {
        Write-Host "✅ Version is 1" -ForegroundColor Green
    } else {
        Write-Host "❌ Version should be 1, got $($flow.version)" -ForegroundColor Red
        exit 1
    }
    
    # Check flow name
    if ($flow.flowName -eq "DailyPractice_v1") {
        Write-Host "✅ Flow name is correct" -ForegroundColor Green
    } else {
        Write-Host "❌ Flow name should be 'DailyPractice_v1', got '$($flow.flowName)'" -ForegroundColor Red
        exit 1
    }
    
    # Check steps
    $expectedSteps = @('onboarding', 'warmup', 'glide', 'phrase', 'reflection')
    foreach ($expectedStep in $expectedSteps) {
        $step = $flow.steps | Where-Object { $_.id -eq $expectedStep }
        if ($step) {
            Write-Host "✅ Step '$expectedStep' found" -ForegroundColor Green
        } else {
            Write-Host "❌ Step '$expectedStep' missing" -ForegroundColor Red
            exit 1
        }
    }
    
    # Check metrics in drill steps
    $drillSteps = $flow.steps | Where-Object { $_.type -eq 'drill' }
    foreach ($step in $drillSteps) {
        if ($step.metrics) {
            Write-Host "✅ Drill step '$($step.id)' has metrics" -ForegroundColor Green
            
            # Check for required metrics
            $requiredMetrics = @('timeInTargetPct', 'smoothness', 'expressiveness')
            foreach ($metric in $requiredMetrics) {
                if ($step.metrics -contains $metric) {
                    Write-Host "  ✅ Metric '$metric' found" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  Metric '$metric' not found (optional)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "❌ Drill step '$($step.id)' missing metrics" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "`n🎉 Flow loading test passed!" -ForegroundColor Green
    Write-Host "📊 Flow Summary:" -ForegroundColor Cyan
    Write-Host "  - Version: $($flow.version)" -ForegroundColor White
    Write-Host "  - Flow Name: $($flow.flowName)" -ForegroundColor White
    Write-Host "  - Total Steps: $($flow.steps.Count)" -ForegroundColor White
    Write-Host "  - Drill Steps: $(($flow.steps | Where-Object { $_.type -eq 'drill' }).Count)" -ForegroundColor White
    Write-Host "  - Info Steps: $(($flow.steps | Where-Object { $_.type -eq 'info' }).Count)" -ForegroundColor White
    Write-Host "  - Reflection Steps: $(($flow.steps | Where-Object { $_.type -eq 'reflection' }).Count)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Flow loading test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
