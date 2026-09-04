#!/bin/bash
while [ ! -f android/app/build/outputs/apk/debug/app-debug.apk ]; do
    sleep 5
done
cp android/app/build/outputs/apk/debug/app-debug.apk ./ai-secure-space-debug.apk
echo "APK copied!"
