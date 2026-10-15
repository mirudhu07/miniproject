#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../ml-service"

echo "========================================================"
echo "  Starting SmartPark AI ML Prediction Service on Port 8000..."
echo "========================================================"
./venv/bin/uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
