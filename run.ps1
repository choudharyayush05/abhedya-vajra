# Operation Vajra - Windows Launcher (PowerShell)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Starting Vajra Workbench (Offline Mode)" -ForegroundColor Green
Write-Host " Indore Police Commissionerate - Cyber Crime Cell" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# Check/create virtual environment
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$venvPip = Join-Path $scriptDir ".venv\Scripts\pip.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
    & $venvPip install --upgrade pip
    & $venvPip install -r requirements.txt
}

# Ensure frontend build exists
if (-not (Test-Path (Join-Path $scriptDir "frontend\dist"))) {
    Write-Host "Building frontend assets..." -ForegroundColor Cyan
    Push-Location "frontend"
    npm install
    npm run build
    Pop-Location
}

Write-Host "`nStarting Vajra Server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process "http://127.0.0.1:8000"
& $venvPython -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
