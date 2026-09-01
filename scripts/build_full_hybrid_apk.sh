#!/usr/bin/env bash
# ==============================================================================
# Sovereign AI Secure Space - Complete Autonomous Hybrid APK Build Pipeline
# Orchestrates:
# 1. ZK Groth16 Proving Keys & WASM circuit compilation
# 2. INT8 Fraud Detection & TFLite Biometric Anti-Spoof model exports
# 3. Production Vite web bundle build & asset sync
# 4. Standalone 200MB+ APK packaging, signing, and checksum verification
# ==============================================================================

set -e

echo "=== [Phase 1/4] Generating Zero-Knowledge Cryptographic Artifacts ==="
node scripts/generate_zk_artifacts.js

echo "=== [Phase 2/4] Exporting Embedded AI & Biometric Models ==="
python3 scripts/export_fraud_model.py
python3 scripts/export_speech_and_liveness.py

echo "=== [Phase 3/4] Compiling Production Vite Web Application ==="
npm run build

echo "=== [Phase 4/4] Assembling Standalone Autonomous Android APK (200MB+) ==="
node scripts/bundle-hybrid-apk.js

echo "=== Full APK Build & Verification Complete! ==="
ls -lh public/*.apk
