#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../mobile"

echo "========================================================"
echo "  Launching SmartPark AI on Apple iOS Simulator..."
echo "========================================================"

# 1. Open the macOS Simulator App
open -a Simulator

# 2. Boot default available device if not already booted
xcrun simctl boot "iPhone 16e" 2>/dev/null || xcrun simctl boot "iPhone 17 Pro" 2>/dev/null || true

# 3. Export localhost hostname to eliminate LAN/mDNS timeout delays
export REACT_NATIVE_PACKAGER_HOSTNAME="127.0.0.1"
export EXPO_USE_LOCAL_CLI=1

# 4. Start Expo targeting the iOS simulator
npx expo start --ios --localhost
