#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../mobile"

export REACT_NATIVE_PACKAGER_HOSTNAME="127.0.0.1"
export EXPO_USE_LOCAL_CLI=1

echo "========================================================"
echo "  Starting SmartPark AI Mobile App (Fast-Boot Metro)..."
echo "  Binding to 127.0.0.1 (Bypassing slow network timeouts)"
echo "========================================================"
echo ""
echo "  💡 Tips:"
echo "  - Press 'i' to launch in Apple iOS Simulator"
echo "  - Press 'a' to launch in Android Emulator"
echo "  - Press 'r' to reload Metro bundler"
echo ""

npm run ios || npx expo start --localhost
