#!/usr/bin/env pwsh
param([int]$Port = 3003)
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -Expand OwningProcess -Unique |
  ForEach-Object { try { Stop-Process -Id $_ -Force } catch {} }
