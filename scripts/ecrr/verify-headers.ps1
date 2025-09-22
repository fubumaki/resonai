[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3003",
  [string[]]$Paths = @("/", "/_next/static/chunks/webpack.js")
)

function Test-Headers {
  param([string]$Url)
  Write-Host "Checking $Url..." -ForegroundColor Cyan
  try {
    $response = Invoke-WebRequest -Uri $Url -Headers @{ "Cache-Control" = "no-cache" } -Method Head
    $coop = $response.Headers["Cross-Origin-Opener-Policy"]
    $coep = $response.Headers["Cross-Origin-Embedder-Policy"]
    
    if ($coop -ne "same-origin" -or $coep -ne "require-corp") {
      Write-Error "Missing COI headers. COOP='$coop', COEP='$coep'"
      return $false
    }
    Write-Host "  ✓ COOP=$coop; COEP=$coep" -ForegroundColor Green
    return $true
  }
  catch {
    Write-Error "Failed to check $Url`: $_"
    return $false
  }
}

Write-Host "== ECRR-01 COI Header Verification ==" -ForegroundColor Yellow
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Paths: $($Paths -join ', ')" -ForegroundColor Gray
Write-Host ""

$allPassed = $true
foreach ($path in $Paths) {
  $url = "$BaseUrl$path"
  $passed = Test-Headers -Url $url
  if (-not $passed) {
    $allPassed = $false
  }
}

Write-Host ""
if ($allPassed) {
  Write-Host "== COI headers verified == ✓" -ForegroundColor Green
  exit 0
} else {
  Write-Host "== COI header verification FAILED == ✗" -ForegroundColor Red
  exit 1
}
