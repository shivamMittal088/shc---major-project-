$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# Use bundled venv python, fall back to system python
$Python = "$Root\.venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    $Python = if ($pythonCmd) { $pythonCmd.Source } else { $null }
    if (-not $Python) {
        $pyCmd = Get-Command py -ErrorAction SilentlyContinue
        $Python = if ($pyCmd) { $pyCmd.Source } else { $null }
    }
    if (-not $Python) {
        Write-Error "Python not found. Install Python 3.11+ or run: winget install Python.Python.3.11"
        exit 1
    }

    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    & $Python -m venv "$Root\.venv"
    $Python = "$Root\.venv\Scripts\python.exe"
}

# Install / sync dependencies if requirements changed
$Req = "$Root\requirements.txt"
$Stamp = "$Root\.venv\.last_install"
$needsInstall = $true
if ((Test-Path $Stamp) -and (Test-Path $Req)) {
    if ((Get-Item $Req).LastWriteTime -le (Get-Item $Stamp).LastWriteTime) {
        $needsInstall = $false
    }
}
if ($needsInstall) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    & $Python -m pip install -q -r $Req
    New-Item -ItemType File -Force $Stamp | Out-Null
}

# Train models if artifacts are missing
$ModelsDir = "$Root\models"
if (-not (Test-Path "$ModelsDir\structured_model.joblib")) {
    Write-Host "Training models (first run)..." -ForegroundColor Cyan
    Push-Location $Root
    & $Python -m training.train_models
    Pop-Location
}

Write-Host ""
Write-Host "Starting SHC Risk ML Service on http://localhost:8081" -ForegroundColor Green
Write-Host "  Health:  http://localhost:8081/healthz" -ForegroundColor DarkGray
Write-Host "  Score:   POST http://localhost:8081/score" -ForegroundColor DarkGray
Write-Host "  Feedback: POST http://localhost:8081/feedback" -ForegroundColor DarkGray
Write-Host ""

Set-Location $Root
& $Python -m uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
