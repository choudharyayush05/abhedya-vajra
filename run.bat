@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo  Starting Vajra Workbench (Offline Mode)
echo  Indore Police Commissionerate - Cyber Crime Cell
echo ============================================================

if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\pip install --upgrade pip
    call .venv\Scripts\pip install -r requirements.txt
)

if not exist "frontend\dist" (
    echo Building frontend static assets...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo Starting server on http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
call .venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
pause
