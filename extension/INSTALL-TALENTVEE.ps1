$ErrorActionPreference = 'Stop'

$packageRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\', '/')
$source = Join-Path $packageRoot 'extension'
$target = Join-Path $env:LOCALAPPDATA 'TalentVee\ShopeeConnector'
$sourceManifest = Join-Path $source 'manifest.json'

if (-not (Test-Path -LiteralPath $sourceManifest -PathType Leaf)) {
  Write-Host 'ERROR: extension\manifest.json is missing.' -ForegroundColor Red
  Write-Host 'Extract the ZIP completely before running INSTALL-TALENTVEE.cmd.' -ForegroundColor Yellow
  exit 2
}

try {
  $manifest = Get-Content -LiteralPath $sourceManifest -Raw | ConvertFrom-Json
} catch {
  Write-Host 'ERROR: extension\manifest.json cannot be read.' -ForegroundColor Red
  exit 3
}

$payloadFiles = @(
  'manifest.json',
  'config.js',
  'background.js',
  'dashboard-bridge.js',
  'tab-resolver.js',
  'crawler.js',
  'intelligence.js',
  'scanner.js',
  'sidepanel.js',
  'sidepanel.html',
  'sidepanel.css'
)

foreach ($file in $payloadFiles) {
  $sourceFile = Join-Path $source $file
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    Write-Host ('ERROR: Package file is missing: extension\' + $file) -ForegroundColor Red
    exit 4
  }
}

$targetIcons = Join-Path $target 'icons'
New-Item -ItemType Directory -Path $target -Force | Out-Null
New-Item -ItemType Directory -Path $targetIcons -Force | Out-Null

foreach ($file in $payloadFiles) {
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $target $file) -Force
}

$sourceIcons = Join-Path $source 'icons'
if (-not (Test-Path -LiteralPath $sourceIcons -PathType Container)) {
  Write-Host 'ERROR: Package folder is missing: extension\icons' -ForegroundColor Red
  exit 5
}

Get-ChildItem -LiteralPath $sourceIcons -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $targetIcons $_.Name) -Force
}

$installedManifest = Join-Path $target 'manifest.json'
try {
  $installed = Get-Content -LiteralPath $installedManifest -Raw | ConvertFrom-Json
} catch {
  Write-Host 'ERROR: Installed manifest verification failed.' -ForegroundColor Red
  exit 6
}

Write-Host ('INSTALLED: ' + $target) -ForegroundColor Green
Write-Host ('VERSION: ' + [string]$installed.version) -ForegroundColor Cyan
Write-Host 'This permanent folder must not be moved or deleted.' -ForegroundColor Yellow

Start-Process explorer.exe -ArgumentList ('"' + $target + '"')
exit 0
