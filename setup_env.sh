#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "===================================================="
echo "🚀 Initializing 9898048483 Quantum Crypto Environment"
echo "===================================================="

# 1. Setup Python Virtual Environment
echo "[1/4] Creating Python virtual environment..."
python3 -m venv venv

# 2. Activate Virtual Environment
echo "[2/4] Activating virtual environment..."
source venv/bin/activate

# 3. Install Python Dependencies
echo "[3/4] Installing Python dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Install Node.js Dependencies
echo "[4/4] Installing Node.js frontend dependencies..."
npm install

echo "===================================================="
echo "✅ Environment setup complete!"
echo "To activate the Python environment manually in the future, run:"
echo "source venv/bin/activate"
echo "===================================================="
