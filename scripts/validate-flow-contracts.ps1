# validate-flow-contracts.ps1
# Validates that the flow runner implementation aligns with the contracts in RESONAI_CODE_MAP.md

Write-Host "🔍 Validating Flow Runner Contracts..." -ForegroundColor Cyan

# Check if required files exist
$requiredFiles = @(
    "flows/schema.ts",
    "flows/presets/DailyPractice_v1.json", 
    "components/Flows/FlowRunner.tsx",
    "app/try/page.tsx",
    "components/HUD/PracticeHUD.tsx"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "❌ Some required files are missing. Cannot proceed with validation." -ForegroundColor Red
    exit 1
}

# Validate FlowV1 contract structure
Write-Host "`n🔍 Validating FlowV1 contract structure..." -ForegroundColor Cyan

$schemaContent = Get-Content "flows/schema.ts" -Raw
$contractChecks = @(
    @{ Pattern = "export interface FlowV1"; Name = "FlowV1 interface" },
    @{ Pattern = "version: 1"; Name = "Version field" },
    @{ Pattern = "flowName: string"; Name = "FlowName field" },
    @{ Pattern = "steps: Array<"; Name = "Steps array" },
    @{ Pattern = "type: 'info'"; Name = "Info step type" },
    @{ Pattern = "type: 'drill'"; Name = "Drill step type" },
    @{ Pattern = "type: 'reflection'"; Name = "Reflection step type" },
    @{ Pattern = "metrics: Array<"; Name = "Metrics array" },
    @{ Pattern = "'timeInTargetPct'"; Name = "timeInTargetPct metric" },
    @{ Pattern = "'smoothness'"; Name = "smoothness metric" },
    @{ Pattern = "'expressiveness'"; Name = "expressiveness metric" }
)

$contractValid = $true
foreach ($check in $contractChecks) {
    if ($schemaContent -match $check.Pattern) {
        Write-Host "✅ $($check.Name) found" -ForegroundColor Green
    } else {
        Write-Host "❌ $($check.Name) missing" -ForegroundColor Red
        $contractValid = $false
    }
}

# Validate DailyPractice preset
Write-Host "`n🔍 Validating DailyPractice preset..." -ForegroundColor Cyan

$presetContent = Get-Content "flows/presets/DailyPractice_v1.json" -Raw
$presetChecks = @(
    @{ Pattern = '"version": 1'; Name = "Version 1" },
    @{ Pattern = '"flowName": "DailyPractice_v1"'; Name = "Correct flow name" },
    @{ Pattern = '"id": "onboarding"'; Name = "Onboarding step" },
    @{ Pattern = '"id": "warmup"'; Name = "Warmup step" },
    @{ Pattern = '"id": "glide"'; Name = "Glide step" },
    @{ Pattern = '"id": "phrase"'; Name = "Phrase step" },
    @{ Pattern = '"id": "reflection"'; Name = "Reflection step" },
    @{ Pattern = '"timeInTargetPct"'; Name = "timeInTargetPct metric" },
    @{ Pattern = '"smoothness"'; Name = "smoothness metric" },
    @{ Pattern = '"expressiveness"'; Name = "expressiveness metric" }
)

$presetValid = $true
foreach ($check in $presetChecks) {
    if ($presetContent -match $check.Pattern) {
        Write-Host "✅ $($check.Name) found" -ForegroundColor Green
    } else {
        Write-Host "❌ $($check.Name) missing" -ForegroundColor Red
        $presetValid = $false
    }
}

# Validate FlowRunner implementation
Write-Host "`n🔍 Validating FlowRunner implementation..." -ForegroundColor Cyan

$runnerContent = Get-Content "components/Flows/FlowRunner.tsx" -Raw
$runnerChecks = @(
    @{ Pattern = "import.*FlowV1.*from.*schema"; Name = "FlowV1 import" },
    @{ Pattern = "calculateStepMetrics"; Name = "Step metrics calculation" },
    @{ Pattern = "timeInTargetPct"; Name = "timeInTargetPct handling" },
    @{ Pattern = "smoothness.*jitterEma|jitterEma.*smoothness"; Name = "Smoothness calculation" },
    @{ Pattern = "expressiveness"; Name = "Expressiveness handling" },
    @{ Pattern = "successThreshold"; Name = "Success threshold checking" },
    @{ Pattern = "PracticeHUD"; Name = "PracticeHUD integration" }
)

$runnerValid = $true
foreach ($check in $runnerChecks) {
    if ($runnerContent -match $check.Pattern) {
        Write-Host "✅ $($check.Name) found" -ForegroundColor Green
    } else {
        Write-Host "❌ $($check.Name) missing" -ForegroundColor Red
        $runnerValid = $false
    }
}

# Validate HUD metrics implementation
Write-Host "`n🔍 Validating HUD metrics implementation..." -ForegroundColor Cyan

$hudContent = Get-Content "components/HUD/PracticeHUD.tsx" -Raw
$hudChecks = @(
    @{ Pattern = "timeInTarget.*metrics\.timeInTargetPct"; Name = "Time in target calculation" },
    @{ Pattern = "smoothness.*metrics\.smoothness.*jitterEma"; Name = "Smoothness calculation" },
    @{ Pattern = "expressiveness.*metrics\.expressiveness"; Name = "Expressiveness display" },
    @{ Pattern = "Time in Target"; Name = "Time in target label" },
    @{ Pattern = "Smoothness"; Name = "Smoothness label" },
    @{ Pattern = "Expressiveness"; Name = "Expressiveness label" }
)

$hudValid = $true
foreach ($check in $hudChecks) {
    if ($hudContent -match $check.Pattern) {
        Write-Host "✅ $($check.Name) found" -ForegroundColor Green
    } else {
        Write-Host "❌ $($check.Name) missing" -ForegroundColor Red
        $hudValid = $false
    }
}

# Final validation summary
Write-Host "`n📊 Validation Summary:" -ForegroundColor Cyan

if ($allFilesExist -and $contractValid -and $presetValid -and $runnerValid -and $hudValid) {
    Write-Host "🎉 All validations passed! Flow runner is ready for testing." -ForegroundColor Green
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Start the development server: npm run dev" -ForegroundColor White
    Write-Host "2. Navigate to /try to test the DailyPractice flow" -ForegroundColor White
    Write-Host "3. Verify metrics display correctly in the HUD" -ForegroundColor White
    Write-Host "4. Complete the full flow from onboarding to reflection" -ForegroundColor White
    
    exit 0
} else {
    Write-Host "❌ Some validations failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}
