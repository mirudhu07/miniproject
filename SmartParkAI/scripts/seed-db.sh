#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../backend"

echo "========================================================"
echo "  Explicitly Seeding SmartPark AI Database..."
echo "========================================================"
./node_modules/.bin/tsx src/seed.ts
