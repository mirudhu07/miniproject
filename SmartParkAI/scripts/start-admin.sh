#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../admin-dashboard"

echo "========================================================"
echo "  Starting SmartPark AI Admin Dashboard on Port 3000..."
echo "========================================================"
npm run dev
