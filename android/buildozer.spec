[app]
title = AI Secure Space Touchless
package.name = ai.secure.space.touchless
package.domain = org.aisecure

source.dir = .
source.include_exts = py,png,jpg,kv,atlas,ttf,json,xml

version = 1.0.0-debug
requirements = python3,kivy,plyer,cryptography,requests,pysocks,numpy

orientation = portrait
fullscreen = 0

android.permissions = USE_BIOMETRIC,USE_FINGERPRINT,INTERNET,ACCESS_NETWORK_STATE,CAMERA
android.api = 34
android.minapi = 21
android.ndk = 25b
android.gradle_dependencies = com.google.mlkit:face-detection:16.1.6,androidx.biometric:biometric:1.2.0-alpha05

# Dist Output Directory (Automated CI/CD build outputs to dist/debug.apk without requiring sudo)
build_dir = ./dist
bin_dir = ./dist

# Tor binary embed
android.add_src = tor-binary/armeabi-v7a/tor -> assets/tor
