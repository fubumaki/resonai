# Simple PowerShell test script for the project
param([string]$TestMessage = "PowerShell is working!")

Write-Host "=== PowerShell Configuration Test ===" -ForegroundColor Green
Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
Write-Host "Execution Policy: $(Get-ExecutionPolicy)" -ForegroundColor Yellow
Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Node.js Version: $(node --version)" -ForegroundColor Yellow
Write-Host "NPM Version: $(npm --version)" -ForegroundColor Yellow
Write-Host "Playwright Version: $(npx playwright --version)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test Message: $TestMessage" -ForegroundColor Cyan
Write-Host "=== Test Complete ===" -ForegroundColor Green
