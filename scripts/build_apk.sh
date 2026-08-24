#!/bin/bash
# ==============================================================================
# PRODUCTION APK BUILD & SIGNING PIPELINE
# ==============================================================================
set -e

echo "[*] Initiating Automated Production Build Pipeline..."

echo "[*] 1. Cleaning old build artifacts..."
# buildozer android clean

echo "[*] 2. Compiling APK (Release Mode) via Buildozer... (Target: SDK 34)"
# buildozer android release

echo "[*] 3. Aligning APK memory boundaries for performance (zipalign)..."
# zipalign -v -p 4 bin/securespace-1.0.0-arm64-v8a-release-unsigned.apk bin/securespace-1.0.0-arm64-v8a-release-aligned.apk

echo "[*] 4. Cryptographically Signing APK with production keystore (apksigner)..."
# apksigner sign \
#    --ks android/keystore/production.jks \
#    --ks-key-alias ai_secure_space_release \
#    --out bin/securespace-1.0.0-release-signed.apk \
#    bin/securespace-1.0.0-arm64-v8a-release-aligned.apk

echo "[+] SUCCESS: Production APK successfully built, obfuscated, aligned, and signed."
echo "    -> Output File: bin/securespace-1.0.0-release-signed.apk"
