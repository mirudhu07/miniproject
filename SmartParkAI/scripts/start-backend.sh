#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../backend"

echo "========================================================"
echo "  Starting SmartPark AI Backend API on Port 5001..."
echo "========================================================"
npm run start
