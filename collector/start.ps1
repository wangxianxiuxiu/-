$ErrorActionPreference = "Stop"

$mediaCrawlerRoot = Join-Path $PSScriptRoot "MediaCrawler"
$venvRoot = Join-Path $mediaCrawlerRoot ".venv"
$venvUv = Join-Path $venvRoot "Scripts\uv.exe"

if (-not (Test-Path -LiteralPath $venvUv)) {
    throw "Dependencies are not installed. Run collector\setup.ps1 first."
}

$env:PATH = "$venvRoot\Scripts;$env:PATH"
$env:PYTHONUNBUFFERED = "1"
if (-not $env:UV_CACHE_DIR) {
    $env:UV_CACHE_DIR = Join-Path $env:TEMP "video-vault-uv-cache"
}
$env:UV_PYTHON = Join-Path $venvRoot "Scripts\python.exe"
New-Item -ItemType Directory -Force -Path $env:UV_CACHE_DIR | Out-Null

Push-Location $mediaCrawlerRoot
try {
    Write-Host "MediaCrawler API: http://127.0.0.1:8080"
    & $venvUv run uvicorn api.main:app --host 127.0.0.1 --port 8080
}
finally {
    Pop-Location
}
