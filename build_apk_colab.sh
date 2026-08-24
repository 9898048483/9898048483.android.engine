#!/bin/bash
set -e

echo "==================================================================="
echo " AI SECURE SPACE - GOOGLE COLAB APK BUILD PIPELINE"
echo "==================================================================="

echo "[*] Updating System & Installing OS Dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq build-essential libltdl-dev libffi-dev libssl-dev python3-dev zip unzip openjdk-17-jdk git autoconf libtool pkg-config zlib1g-dev libncurses5-dev libncursesw5-dev libtinfo5 cmake

echo "[*] Installing Buildozer, Cython, and Virtualenv..."
pip install --upgrade buildozer cython virtualenv setuptools

echo "[*] Preparing Project Directory Structure..."
if [ ! -d "android-client" ]; then
    echo "[!] android-client directory not found! Ensure python scripts are in place."
    exit 1
fi

cd android-client

if [ ! -f "main.py" ]; then
    echo "[!] ERROR: main.py not found in android-client/. Please write the python files first."
    exit 1
fi

echo "[*] Triggering Buildozer APK Compilation..."
echo "[!] This will download the Android SDK/NDK and may take 15-20 minutes."
yes | buildozer -v android debug

echo "[+] SUCCESS: APK Compiled!"
echo "[+] Location: android-client/bin/*.apk"
