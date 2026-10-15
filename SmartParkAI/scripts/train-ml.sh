#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../ml-service"

echo "========================================================"
echo "  Training SmartPark AI Occupancy Prediction Model..."
echo "========================================================"
./venv/bin/python src/train.py
