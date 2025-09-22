<#
ECRR Doctor - Resonai Project
-----------------------------
Environment validation script for the Resonai web application.
Usage: pwsh -File scripts/ecrr-doctor.ps1
Creates artifacts/ecrr-doctor.txt with the collected notes.
#>

$issues = @()
$warnings = @()
$report = @()

function Add-ReportLine {
    param(
        [string]$Level,
        [string]$Message,
        [System.ConsoleColor]$Color = [System.ConsoleColor]::Gray
    )

    $line = "[$Level] $Message"
    $script:report += $line
    Write-Host $line -ForegroundColor $Color
}

function Test-Port {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect('localhost', $Port, $null, $null)
        $completed = $async.AsyncWaitHandle.WaitOne(500)
        if (-not $completed) {
            $client.Close()
            return $false
        }
        $client.EndConnect($async)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

Add-ReportLine -Level 'INFO' -Message 'ECRR Doctor - Resonai Environment Examination' -Color Cyan
Add-ReportLine -Level 'INFO' -Message ('Timestamp: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -Color Cyan
Add-ReportLine -Level 'INFO' -Message ('Working directory: ' + (Get-Location))
Add-ReportLine -Level 'INFO' -Message ('PowerShell version: ' + $PSVersionTable.PSVersion)

# Tooling checks
Add-ReportLine -Level 'SECTION' -Message 'Development tooling' -Color Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = (node --version 2>$null)
    Add-ReportLine -Level 'OK' -Message ('Node.js detected: ' + $nodeVersion.Trim()) -Color Green
} else {
    $issues += 'Node.js not found in PATH'
    Add-ReportLine -Level 'FAIL' -Message 'Node.js not found in PATH' -Color Red
}

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVersion = (pnpm --version 2>$null)
    Add-ReportLine -Level 'OK' -Message ('pnpm detected: ' + $pnpmVersion.Trim()) -Color Green
} else {
    $warnings += 'pnpm not found in PATH'
    Add-ReportLine -Level 'WARN' -Message 'pnpm not found in PATH' -Color Yellow
}

# Package.json check
if (Test-Path 'package.json') {
    Add-ReportLine -Level 'OK' -Message 'package.json found' -Color Green
} else {
    $issues += 'package.json not found - not in project root?'
    Add-ReportLine -Level 'FAIL' -Message 'package.json not found' -Color Red
}

# Development server check
Add-ReportLine -Level 'SECTION' -Message 'Development server status' -Color Yellow
$devPorts = 3000, 3001, 3002, 3003, 5173
$devServerRunning = $false

foreach ($port in $devPorts) {
    if (Test-Port -Port $port) {
        Add-ReportLine -Level 'OK' -Message ("Dev server detected on port $port") -Color Green
        $devServerRunning = $true
        break
    }
}

if (-not $devServerRunning) {
    $warnings += 'No development server detected on common ports'
    Add-ReportLine -Level 'WARN' -Message 'No development server detected. Run: pnpm dev' -Color Yellow
}

# Agent infrastructure
Add-ReportLine -Level 'SECTION' -Message 'Agent workflow files' -Color Yellow
if (Test-Path '.agent') {
    Add-ReportLine -Level 'OK' -Message '.agent directory present' -Color Green
    if (Test-Path '.agent/LOCK') {
        $warnings += '.agent/LOCK present (agents paused)'
        Add-ReportLine -Level 'WARN' -Message '.agent/LOCK present (agents paused)' -Color Yellow
    }
    if (Test-Path '.agent/status.json') {
        Add-ReportLine -Level 'OK' -Message '.agent/status.json found' -Color Green
    }
} else {
    $warnings += '.agent directory missing'
    Add-ReportLine -Level 'WARN' -Message '.agent directory missing' -Color Yellow
}

# ECRR reports directory
Add-ReportLine -Level 'SECTION' -Message 'ECRR report storage' -Color Yellow
if (-not (Test-Path 'docs/ECRR_REPORTS')) {
    New-Item -ItemType Directory -Path 'docs/ECRR_REPORTS' -Force | Out-Null
    Add-ReportLine -Level 'OK' -Message 'Created docs/ECRR_REPORTS directory' -Color Green
} else {
    $count = (Get-ChildItem 'docs/ECRR_REPORTS' -Filter '*.md' | Measure-Object).Count
    Add-ReportLine -Level 'OK' -Message ("docs/ECRR_REPORTS present with $count markdown files") -Color Green
}

# Resonai-specific checks
Add-ReportLine -Level 'SECTION' -Message 'Resonai-specific validation' -Color Yellow

# Check for key Resonai files
$resonaiFiles = @(
    'app/layout.tsx',
    'app/page.tsx',
    'audio',
    'components',
    'coach'
)

foreach ($file in $resonaiFiles) {
    if (Test-Path $file) {
        Add-ReportLine -Level 'OK' -Message "Resonai component found: $file" -Color Green
    } else {
        $warnings += "Resonai component missing: $file"
        Add-ReportLine -Level 'WARN' -Message "Resonai component missing: $file" -Color Yellow
    }
}

# Suggested manual checks
Add-ReportLine -Level 'SECTION' -Message 'Manual follow-up checks' -Color Yellow
Add-ReportLine -Level 'NOTE' -Message 'Open browser devtools and check: location.href, window.crossOriginIsolated === true'
Add-ReportLine -Level 'NOTE' -Message 'Test mic constraints: navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})'
Add-ReportLine -Level 'NOTE' -Message 'Verify practice flow: warm-up → glide → phrase → reflection displays correctly'
Add-ReportLine -Level 'NOTE' -Message 'Check IndexedDB: open DevTools → Application → IndexedDB → ResonaiDB'

# Summary
Add-ReportLine -Level 'SECTION' -Message 'Summary' -Color Yellow
if ($issues.Count -eq 0) {
    Add-ReportLine -Level 'OK' -Message 'No critical issues detected' -Color Green
} else {
    foreach ($issue in $issues) {
        Add-ReportLine -Level 'FAIL' -Message $issue -Color Red
    }
}

if ($warnings.Count -gt 0) {
    foreach ($warning in $warnings) {
        Add-ReportLine -Level 'WARN' -Message $warning -Color Yellow
    }
}

# Persist artifact
$artifactDir = 'artifacts'
if (-not (Test-Path $artifactDir)) {
    New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
}
$artifactPath = Join-Path $artifactDir 'ecrr-doctor.txt'
$report | Set-Content -Path $artifactPath
Add-ReportLine -Level 'INFO' -Message ('Report written to ' + (Resolve-Path $artifactPath)) -Color Cyan

if ($issues.Count -gt 0) {
    exit 1
} else {
    exit 0
}
