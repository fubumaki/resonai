# PowerShell Setup and Configuration for ResonAI Project
Write-Host "=== ResonAI PowerShell Configuration ===" -ForegroundColor Green

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion
Write-Host "PowerShell Version: $psVersion" -ForegroundColor Yellow

if ($psVersion.Major -ge 5) {
    Write-Host "✓ PowerShell version is compatible" -ForegroundColor Green
} else {
    Write-Host "WARNING: PowerShell 5.0 or higher is recommended" -ForegroundColor Red
}

# Check execution policy
$executionPolicy = Get-ExecutionPolicy
Write-Host "Current Execution Policy: $executionPolicy" -ForegroundColor Yellow

if ($executionPolicy -eq "Restricted") {
    Write-Host "WARNING: Execution policy is Restricted. Scripts may not run." -ForegroundColor Red
    Write-Host "To fix: Run as Administrator and execute:" -ForegroundColor Yellow
    Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Cyan
} else {
    Write-Host "✓ Execution policy allows script execution" -ForegroundColor Green
}

# Check required tools
Write-Host "`n=== Required Tools ===" -ForegroundColor Green

# Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
}

# NPM
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✓ NPM: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ NPM not found" -ForegroundColor Red
}

# Playwright
$playwrightVersion = npx playwright --version 2>$null
if ($playwrightVersion) {
    Write-Host "✓ Playwright: $playwrightVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Playwright not found" -ForegroundColor Red
}

# Check project files
Write-Host "`n=== Project Files ===" -ForegroundColor Green

$requiredFiles = @(
    "package.json",
    "playwright.config.ts",
    "playwright/playwright.noweb.config.ts",
    "scripts/run-e2e.ps1"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

# Test port availability
Write-Host "`n=== Port 3003 Test ===" -ForegroundColor Green
$portTest = Test-NetConnection -ComputerName localhost -Port 3003 -InformationLevel Quiet
if ($portTest) {
    Write-Host "✓ Port 3003 is in use (dev server running)" -ForegroundColor Green
} else {
    Write-Host "• Port 3003 is available (dev server not running)" -ForegroundColor Yellow
}

Write-Host "`n=== Configuration Complete ===" -ForegroundColor Green
Write-Host "PowerShell is ready for the ResonAI project!" -ForegroundColor Cyan
