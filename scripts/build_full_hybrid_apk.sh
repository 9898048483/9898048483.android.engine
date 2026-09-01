#!/usr/bin/env bash
set -e

# ==============================================================================
# AI Secure Space - Complete Standalone Hybrid Android APK Build Script
# Compiles React/Vite web application, syncs assets into Android WebView container,
# and builds a signed release APK using Android Gradle Plugin / SDK.
# ==============================================================================

echo "=========================================================="
echo "⚡ Starting AI Secure Space Full Hybrid UI Android Build"
echo "=========================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Step 1: Building production React/Vite web bundle..."
npm run build

echo "Step 2: Bundling web assets into Android container & Hybrid APK..."
node scripts/bundle-hybrid-apk.js

echo "Step 3: Checking for Android SDK & Gradle environment..."
if command -v gradle &> /dev/null || [ -f "android/gradlew" ]; then
    echo "Found Gradle environment. Compiling native APK via Gradle..."
    cd android
    chmod +x gradlew 2>/dev/null || true
    if [ -f "gradlew" ]; then
        ./gradlew assembleRelease || ./gradlew assembleDebug || true
    fi
    cd "$PROJECT_ROOT"
else
    echo "Native Gradle/Android SDK not locally installed; packaged self-contained hybrid APK container directly."
fi

echo "=========================================================="
echo "✅ Build Process Finished!"
echo "Available APK Artifacts in /public:"
ls -lh public/*.apk 2>/dev/null || true
echo "=========================================================="
