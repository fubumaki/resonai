param([switch]$UseExistingServer, [int]$Port = 3003, [int]$StartupTimeoutSec = 180)
$ErrorActionPreference = 'Stop'

function Test-PortReady([int]$Port) {
  try { 
    Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port" -TimeoutSec 2 | Out-Null
    return $true 
  } catch { 
    return $false 
  }
}

$serverProc = $null
$startedHere = $false

if (-not $UseExistingServer) {
  if (-not (Test-PortReady -Port $Port)) {
    Write-Host "Starting dev server on :$Port ..."
    $log = Join-Path $PSScriptRoot "dev-server-$Port.log"
    $serverProc = Start-Process powershell -ArgumentList "-NoLogo","-NoProfile","-Command","npm run dev:ci" -PassThru -RedirectStandardOutput $log -RedirectStandardError $log
    $startedHere = $true
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Milliseconds 500
      if (Test-PortReady -Port $Port) { break }
      if ($serverProc.HasExited) { 
        Get-Content -Tail 200 $log
        exit 1 
      }
    }
    if (-not (Test-PortReady -Port $Port)) { 
      Write-Host "Timed out waiting for :$Port"
      exit 1 
    }
  } else { 
    Write-Host "Server already listening on :$Port - reusing it." 
  }
} else {
  Write-Host "Using existing server on :$Port"
}

# Always use the noweb config to avoid env var pitfalls
npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox
$code = $LASTEXITCODE

if ($startedHere -and $serverProc -and -not $serverProc.HasExited) {
  try { 
    Stop-Process -Id $serverProc.Id -Force 
  } catch {}
}
exit $code