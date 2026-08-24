# ==============================================================================
# AI SECURE SPACE - BUILDOZER CONFIGURATION MANIFEST (ROOT ENTRY)
# Target: Android SDK 34 (Android 14) / NDK r25b (25.2.9519653)
# Architectures: arm64-v8a, armeabi-v7a, x86_64
# Security: Anti-Tamper SHA256 Integrity Verification, FLAG_SECURE, TEE Keystore
# ==============================================================================

[app]
title = AI Secure Space Touchless
package.name = ai.secure.space.touchless
package.domain = org.aisecure
source.dir = android
source.include_exts = py,png,jpg,kv,atlas,ttf,json,xml,so,bin
source.include_patterns = assets/*,service/*,native/*,python/*
source.exclude_exts = spec,pyc,pyo,bak,tmp,log
source.exclude_dirs = tests,bin,.git,.github,.cache,.buildozer,build,dist
version = 2.5.0-production
version.code = 250
requirements = python3==3.11.5,hostpython3==3.11.5,kivy==2.3.0,plyer==2.1.0,cryptography==42.0.5,pysocks==1.7.1,numpy==1.26.4,requests==2.31.0,urllib3==2.2.1,cffi==1.16.0,pycparser==2.21,pydantic==2.6.4,pydantic-core==2.16.3,typing-extensions==4.10.0,certifi==2024.2.2
orientation = portrait
services = ZeroTouchDaemon:service/battery_daemon.py:foreground

# Android specific
fullscreen = 0
android.presplash_color = #0A0F1D
android.permissions = USE_BIOMETRIC,USE_FINGERPRINT,INTERNET,ACCESS_NETWORK_STATE,CAMERA,FOREGROUND_SERVICE,FOREGROUND_SERVICE_SPECIAL_USE,POST_NOTIFICATIONS,RECEIVE_BOOT_COMPLETED,WAKE_LOCK,SYSTEM_ALERT_WINDOW
android.features = android.hardware.camera.any,android.hardware.camera.autofocus,android.hardware.fingerprint
android.api = 34
android.minapi = 26
android.sdk = 34
android.ndk = 25b
android.ndk_api = 26
android.private_storage = True
android.skip_update = False
android.accept_sdk_license = True
android.entrypoint = org.kivy.android.PythonActivity
android.gradle_dependencies = com.google.mlkit:face-detection:16.1.6,androidx.biometric:biometric:1.2.0-alpha05,androidx.security:security-crypto:1.1.0-alpha06,androidx.core:core-ktx:1.12.0,androidx.appcompat:appcompat:1.6.1,com.google.android.material:material:1.11.0
android.add_gradle_repositories = "mavenCentral()", "google()"
android.add_src = android/assets/bin/tor-arm64-v8a -> assets/tor/tor-arm64, android/assets/bin/tor-armeabi-v7a -> assets/tor/tor-armv7, android/assets/bin/tor-x86_64 -> assets/tor/tor-x86_64, android/native/libnative_ipc_firewall.so -> lib/arm64-v8a/libnative_ipc_firewall.so
android.archs = arm64-v8a, armeabi-v7a, x86_64
android.enable_androidx = True
android.manifest.allow_backup = False
android.release_artifact = apk
android.debug_artifact = apk
android.copy_libs = 1
android.enable_proguard = True

# CI/CD Output
build_dir = ./dist
bin_dir = ./dist

[buildozer]
log_level = 2
warn_on_root = 1
