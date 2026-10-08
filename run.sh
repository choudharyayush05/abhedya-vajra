#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================================"
echo " Starting Vajra Workbench (Offline Mode)"
echo " Indore Police Commissionerate - Cyber Crime Cell"
echo "============================================================"

# Ensure venv exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi

# Build frontend if dist missing
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend static assets..."
    cd frontend && npm install && npm run build && cd ..
fi

echo "Starting server on http://127.0.0.1:8000 ..."
exec .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
