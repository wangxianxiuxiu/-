$ErrorActionPreference = "Stop"

$mediaCrawlerRoot = Join-Path $PSScriptRoot "MediaCrawler"
$venvRoot = Join-Path $mediaCrawlerRoot ".venv"

if (-not (Test-Path -LiteralPath $mediaCrawlerRoot)) {
    throw "MediaCrawler directory not found: $mediaCrawlerRoot"
}

function Find-Python {
    $candidates = @(
        $env:CODEX_PYTHON,
        "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
        (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    if (-not $candidates.Count) {
        throw "Python was not found. Install Python 3.11 or newer first."
    }

    return @($candidates)[0]
}

$python = Find-Python

if (-not (Test-Path -LiteralPath (Join-Path $venvRoot "Scripts\python.exe"))) {
    Write-Host "Creating Python virtual environment..."
    & $python -m venv $venvRoot
}

$venvPython = Join-Path $venvRoot "Scripts\python.exe"
$venvUv = Join-Path $venvRoot "Scripts\uv.exe"
$env:UV_CACHE_DIR = Join-Path $env:TEMP "video-vault-uv-cache"
$env:UV_PYTHON = $venvPython

New-Item -ItemType Directory -Force -Path $env:UV_CACHE_DIR | Out-Null

Write-Host "Installing uv..."
& $venvPython -m pip install --upgrade pip uv
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install uv."
}

Write-Host "Installing MediaCrawler dependencies..."
Push-Location $mediaCrawlerRoot
try {
    & $venvUv sync --python $venvPython
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install MediaCrawler dependencies."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete. Run collector\start.ps1 to start the free collector."
